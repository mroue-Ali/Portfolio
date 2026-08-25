"""
Image uploads for the CMS.

Three routes, all behind the same guard as the rest of the admin API: send a
file, list what has been sent, remove one. What comes back is the URL to store
in whichever column the image belongs to — the CMS never builds that path
itself, so moving the media directory is a `.env` change and nothing else.

Deleting a file does not touch the rows pointing at it. That is deliberate: the
alternative is scanning every table on every delete, and a project whose
screenshot is missing renders its empty frame rather than breaking.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, File, UploadFile, status
from pydantic import BaseModel

from .. import media
from ..security import require_editor

router = APIRouter(
    prefix="/api/admin/uploads",
    tags=["admin:uploads"],
    dependencies=[Depends(require_editor)],
)


class UploadOut(BaseModel):
    filename: str
    #: Where the file is served from — this is what goes in the content column.
    url: str
    size: int
    content_type: str
    uploaded_at: datetime


@router.post("", response_model=UploadOut, status_code=status.HTTP_201_CREATED, summary="Upload an image")
async def upload(file: UploadFile = File(...)):
    stored = await media.save(file)
    return UploadOut(**stored.__dict__)


@router.get("", response_model=list[UploadOut], summary="List uploaded images")
def index():
    """The library the CMS offers when you want an image you already uploaded."""
    return [UploadOut(**f.__dict__) for f in media.listing()]


@router.delete("/{filename}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete an image")
def remove(filename: str):
    media.delete(filename)
