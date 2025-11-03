import os
import logging
import json
from typing import List, Optional

from datetime import datetime, timezone

from azure.core.credentials import AzureKeyCredential

from .blobmanager import BlobManager
from .embeddings import ImageEmbeddings, OpenAIEmbeddings
from .fileprocessor import FileProcessor
from .listfilestrategy import File, ListFileStrategy
from .mediadescriber import ContentUnderstandingDescriber
from .searchmanager import SearchManager, Section
from .strategy import DocumentAction, SearchInfo, Strategy

logger = logging.getLogger("scripts")


async def parse_file(
    file: File,
    file_processors: dict[str, FileProcessor],
    category: Optional[List[str]],
    docdate: Optional[str] = None,
    image_embeddings: Optional[ImageEmbeddings] = None,
) -> list[Section]:
    key = file.file_extension().lower()
    processor = file_processors.get(key)
    if processor is None:
        logger.info("Skipping '%s', no parser found.", file.filename())
        return []
    logger.info("Ingesting '%s'", file.filename())
    pages = [page async for page in processor.parser.parse(content=file.content)]
    logger.info("Splitting '%s' into sections", file.filename())
    if image_embeddings:
        logger.warning("Each page will be split into smaller chunks of text, but images will be of the entire page.")
    sections = [
        Section(split_page, content=file, category=category, docdate=docdate,) for split_page in processor.splitter.split_pages(pages)
    ]
    return sections


class FileStrategy(Strategy):
    """
    Strategy for ingesting documents into a search service from files stored either locally or in a data lake storage account
    """

    # Set your manual_docdate here. Use None to default to system's current date.
    #manual_docdate: Optional[str] = "2024-07-01T12:00:00Z"  # Change as needed
    manual_docdate: Optional[str] = None

    def __init__(
        self,
        list_file_strategy: ListFileStrategy,
        blob_manager: BlobManager,
        search_info: SearchInfo,
        file_processors: dict[str, FileProcessor],
        document_action: DocumentAction = DocumentAction.Add,
        embeddings: Optional[OpenAIEmbeddings] = None,
        image_embeddings: Optional[ImageEmbeddings] = None,
        search_analyzer_name: Optional[str] = None,
        search_field_name_embedding: Optional[str] = None,
        use_acls: bool = False,
        category: Optional[List[str]] = None,
        docdate: Optional[str] = None,
        use_content_understanding: bool = False,
        content_understanding_endpoint: Optional[str] = None,
    ):
        self.list_file_strategy = list_file_strategy
        self.blob_manager = blob_manager
        self.file_processors = file_processors
        self.document_action = document_action
        self.embeddings = embeddings
        self.image_embeddings = image_embeddings
        self.search_analyzer_name = search_analyzer_name
        self.search_field_name_embedding = search_field_name_embedding
        self.search_info = search_info
        self.use_acls = use_acls
        self.category = category
        self.use_content_understanding = use_content_understanding
        self.content_understanding_endpoint = content_understanding_endpoint
        self.docdate = docdate

    def setup_search_manager(self):
        self.search_manager = SearchManager(
            self.search_info,
            self.search_analyzer_name,
            self.use_acls,
            False,
            self.embeddings,
            field_name_embedding=self.search_field_name_embedding,
            search_images=self.image_embeddings is not None,
        )

    async def setup(self):
        self.setup_search_manager()
        await self.search_manager.create_index()

        if self.use_content_understanding:
            if self.content_understanding_endpoint is None:
                raise ValueError("Content Understanding is enabled but no endpoint was provided")
            if isinstance(self.search_info.credential, AzureKeyCredential):
                raise ValueError(
                    "AzureKeyCredential is not supported for Content Understanding, use keyless auth instead"
                )
            cu_manager = ContentUnderstandingDescriber(self.content_understanding_endpoint, self.search_info.credential)
            await cu_manager.create_analyzer()

    async def run(self):
        self.setup_search_manager()

        # Load the category JSON from a local file
        try:
            with open("app/backend/prepdocslib/category.json", "r") as f:
                category_data = json.load(f)
            category_keywords = category_data.get("category", [])
        except Exception as e:
            logger.error("Error loading category JSON file: " + str(e))
            category_keywords = []
                                
        if self.document_action == DocumentAction.Add:
            files = self.list_file_strategy.list()
            async for file in files:
                try:
                    # Match keywords based on the filename
                    filename_lower = os.path.basename(file.filename()).lower()
                    matched_categories = set()
                    for keyword in category_keywords:
                        if keyword.lower() in filename_lower:
                            matched_categories.add(keyword.lower())
                    file_category = list(matched_categories)

                    # Use the manual_docdate if set; otherwise, compute the current docdate
                    file_docdate = self.manual_docdate if self.manual_docdate else datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                                    
                    sections = await parse_file(file, self.file_processors, file_category, file_docdate, self.image_embeddings)
                    if sections:
                        blob_sas_uris = await self.blob_manager.upload_blob(file)
                        blob_image_embeddings: Optional[list[list[float]]] = None
                        if self.image_embeddings and blob_sas_uris:
                            blob_image_embeddings = await self.image_embeddings.create_embeddings(blob_sas_uris)
                        await self.search_manager.update_content(sections, blob_image_embeddings, url=file.url)
                finally:
                    if file:
                        file.close()
        elif self.document_action == DocumentAction.Remove:
            paths = self.list_file_strategy.list_paths()
            async for path in paths:
                await self.blob_manager.remove_blob(path)
                await self.search_manager.remove_content(path)
        elif self.document_action == DocumentAction.RemoveAll:
            await self.blob_manager.remove_blob()
            await self.search_manager.remove_content()


class UploadUserFileStrategy:
    """
    Strategy for ingesting a file that has already been uploaded to a ADLS2 storage account
    """

    def __init__(
        self,
        search_info: SearchInfo,
        file_processors: dict[str, FileProcessor],
        embeddings: Optional[OpenAIEmbeddings] = None,
        image_embeddings: Optional[ImageEmbeddings] = None,
        search_field_name_embedding: Optional[str] = None,
        category: Optional[List[str]] = None,
        docdate: Optional[str] = None,
    ):
        self.file_processors = file_processors
        self.embeddings = embeddings
        self.image_embeddings = image_embeddings
        self.search_info = search_info
        self.search_manager = SearchManager(
            search_info=self.search_info,
            search_analyzer_name=None,
            use_acls=True,
            use_int_vectorization=False,
            embeddings=self.embeddings,
            field_name_embedding=search_field_name_embedding,
            search_images=False,
        )
        self.search_field_name_embedding = search_field_name_embedding
        self.category = category
        self.docdate = docdate

    async def add_file(self, file: File):
        if self.image_embeddings:
            logging.warning("Image embeddings are not currently supported for the user upload feature")
        # Compute the docdate once for this upload (current UTC time, ISO 8601 format)
        self.docdate = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        self.category = ["privat"]

        # Pass the computed docdate to parse_file so that each Section gets it
        sections = await parse_file(file, self.file_processors, self.category, self.docdate)
        if sections:
            await self.search_manager.update_content(sections, url=file.url)

    async def remove_file(self, filename: str, oid: str):
        if filename is None or filename == "":
            logging.warning("Filename is required to remove a file")
            return
        await self.search_manager.remove_content(filename, oid)
