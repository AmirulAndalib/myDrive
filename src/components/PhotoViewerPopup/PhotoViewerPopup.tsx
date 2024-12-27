import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../hooks/store";
import {
  deleteVideoTokenAPI,
  getFileFullThumbnailAPI,
  getVideoTokenAPI,
} from "../../api/filesAPI";
import CloseIcon from "../../icons/CloseIcon";
import ActionsIcon from "../../icons/ActionsIcon";
import { useContextMenu } from "../../hooks/contextMenu";
import ContextMenu from "../ContextMenu/ContextMenu";
import { resetPopupSelect, setPopupSelect } from "../../reducers/selected";
import CircleLeftIcon from "../../icons/CircleLeftIcon";
import CircleRightIcon from "../../icons/CircleRightIcon";
import { useFiles, useFullThumbnail, useQuickFiles } from "../../hooks/files";
import { FileInterface } from "../../types/file";
import { InfiniteData } from "react-query";
import { getFileColor, getFileExtension } from "../../utils/files";
import Spinner from "../Spinner/Spinner";
import { toast } from "react-toastify";
import getBackendURL from "../../utils/getBackendURL";

interface PhotoViewerPopupProps {
  file: FileInterface;
}

const PhotoViewerPopup: React.FC<PhotoViewerPopupProps> = memo((props) => {
  const { file } = props;
  const [video, setVideo] = useState("");
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const type = useAppSelector((state) => state.selected.popupModal.type)!;
  const { data: thumbnail, isLoading: isThumbnailLoading } = useFullThumbnail(
    file._id,
    file.metadata.isVideo
  );
  const finalLastPageLoaded = useRef(false);
  const loadingNextPage = useRef(false);
  const { data: quickFiles } = useQuickFiles(false);
  const { data: files, fetchNextPage } = useFiles(false);
  const dispatch = useAppDispatch();
  const {
    onContextMenu,
    closeContextMenu,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    clickStopPropagation,
    ...contextMenuState
  } = useContextMenu();

  const fileExtension = useMemo(
    () => getFileExtension(file.filename, 3),
    [file.filename]
  );

  const imageColor = useMemo(
    () => getFileColor(file.filename),
    [file.filename]
  );

  const getVideo = useCallback(async () => {
    try {
      setIsVideoLoading(true);
      setVideo("");
      await getVideoTokenAPI();
      const videoURL = `${getBackendURL()}/file-service/stream-video/${
        file._id
      }`;
      console.log("video url", videoURL);
      setVideo(videoURL);
      setIsVideoLoading(false);
    } catch (e) {
      console.log("Error getting video", e);
      toast.error("Error getting video");
    }
  }, [file._id, getVideoTokenAPI]);

  const cleanUpVideo = useCallback(async () => {
    if (!file.metadata.isVideo || !videoRef.current) return;

    deleteVideoTokenAPI();

    videoRef.current.pause();
    videoRef.current.src = "";
    setVideo("");
  }, [file._id, deleteVideoTokenAPI]);

  const findPrevFilesItem = (newFiles?: InfiniteData<FileInterface[]>) => {
    if (newFiles) {
      if (!newFiles?.pages) return 0;
      const filesFiltered = newFiles.pages
        .flat()
        .filter(
          (currentFile) =>
            currentFile.metadata.hasThumbnail || currentFile.metadata.isVideo
        );
      const index = filesFiltered.findIndex(
        (currentFile) => currentFile._id === file._id
      );
      const prevItem = filesFiltered[index - 1];
      return prevItem;
    } else {
      if (!files?.pages) return 0;
      const filesFiltered = files.pages
        .flat()
        .filter(
          (currentFile) =>
            currentFile.metadata.hasThumbnail || currentFile.metadata.isVideo
        );
      const index = filesFiltered.findIndex(
        (currentFile) => currentFile._id === file._id
      );
      const prevItem = filesFiltered[index - 1];
      return prevItem;
    }
  };

  const goToPreviousItem = async () => {
    if (type === "quick-item") {
      if (!quickFiles?.length) return 0;
      const filteredQuickFiles = quickFiles.filter(
        (currentFile) =>
          currentFile.metadata.hasThumbnail || currentFile.metadata.isVideo
      );
      const index = filteredQuickFiles.findIndex(
        (currentFile) => currentFile._id === file._id
      );
      const prevItem = filteredQuickFiles[index - 1];
      if (prevItem) {
        dispatch(setPopupSelect({ type: "quick-item", file: prevItem }));
      }
    } else {
      if (!files?.pages) return 0;
      const prevItem = findPrevFilesItem();
      console.log("prev item", prevItem);
      if (prevItem) {
        dispatch(setPopupSelect({ type: "file", file: prevItem }));
      }
      // TODO: Perhaps implement this if needed in the future
      //   else {
      //     console.log("fetch prev");
      //     const response = await fetchPreviousPage();
      //     if (!response.data?.pages) return;
      //     const fetchedPrevItem = findPrevFilesItem(response.data);
      //     if (fetchedPrevItem) {
      //       dispatch(setPopupSelect({ type: "file", file: fetchedPrevItem }));
      //     }
      //   }
    }
  };

  const findNextFilesItem = (newFiles?: InfiniteData<FileInterface[]>) => {
    if (newFiles) {
      if (!newFiles?.pages) return 0;
      const filesFiltered = newFiles.pages
        .flat()
        .filter(
          (currentFile) =>
            currentFile.metadata.hasThumbnail || currentFile.metadata.isVideo
        );
      const index = filesFiltered.findIndex(
        (currentFile) => currentFile._id === file._id
      );
      const nextItem = filesFiltered[index + 1];
      return nextItem;
    } else {
      if (!files?.pages) return 0;
      const filesFiltered = files.pages
        .flat()
        .filter(
          (currentFile) =>
            currentFile.metadata.hasThumbnail || currentFile.metadata.isVideo
        );
      const index = filesFiltered.findIndex(
        (currentFile) => currentFile._id === file._id
      );
      const nextItem = filesFiltered[index + 1];
      return nextItem;
    }
  };

  const goToNextItem = async () => {
    if (type === "quick-item") {
      if (!quickFiles?.length) return;
      const filteredQuickFiles = quickFiles.filter(
        (currentFile) =>
          currentFile.metadata.hasThumbnail || currentFile.metadata.isVideo
      );
      const index = filteredQuickFiles.findIndex(
        (currentFile) => currentFile._id === file._id
      );
      const nextItem = filteredQuickFiles[index + 1];
      if (nextItem) {
        dispatch(setPopupSelect({ type: "quick-item", file: nextItem }));
      }
    } else {
      if (!files?.pages) return;
      const nextItem = findNextFilesItem();
      if (nextItem) {
        dispatch(setPopupSelect({ type: "file", file: nextItem }));
      } else if (!finalLastPageLoaded.current && !loadingNextPage.current) {
        loadingNextPage.current = true;
        const newFilesResponse = await fetchNextPage();
        if (!newFilesResponse.data?.pages) return;
        const fetchedNextItem = findNextFilesItem(newFilesResponse.data);
        if (fetchedNextItem) {
          dispatch(setPopupSelect({ type: "file", file: fetchedNextItem }));
        } else {
          finalLastPageLoaded.current = true;
        }
        loadingNextPage.current = false;
      }
    }
  };

  const closePhotoViewer = useCallback(() => {
    dispatch(resetPopupSelect());
  }, [resetPopupSelect]);

  useEffect(() => {
    if (file.metadata.isVideo) {
      getVideo();
    }

    return () => {
      cleanUpVideo();
    };
  }, [file.metadata.isVideo, getVideo, cleanUpVideo]);

  return (
    <div className="w-screen dynamic-height bg-black bg-opacity-80 absolute top-0 left-0 right-0 bottom-0 z-50 flex justify-center items-center flex-col">
      {contextMenuState.selected && (
        <div onClick={clickStopPropagation}>
          <ContextMenu
            quickItemMode={false}
            contextSelected={contextMenuState}
            closeContext={closeContextMenu}
            file={file}
          />
        </div>
      )}

      <div
        className="absolute top-[20px] flex justify-between w-full"
        id="actions-wrapper"
      >
        <div className="ml-4 flex items-center">
          <span className="inline-flex items-center mr-[15px] max-w-[27px] min-w-[27px] min-h-[27px] max-h-[27px]">
            <div
              className="h-[27px] w-[27px] bg-red-500 rounded-[3px] flex flex-row justify-center items-center"
              style={{ background: imageColor }}
            >
              <span className="font-semibold text-[9.5px] text-white">
                {fileExtension}
              </span>
            </div>
          </span>
          <p className="text-md text-white text-ellipsis overflow-hidden max-w-[200px] md:max-w-[600px] whitespace-nowrap">
            {file.filename}
          </p>
        </div>
        <div className="flex mr-4">
          <div onClick={onContextMenu} id="action-context-wrapper">
            <ActionsIcon
              className="pointer text-white w-[20px] h-[25px] mr-4 cursor-pointer hover:text-white-hover"
              id="action-context-icon"
            />
          </div>

          <div onClick={closePhotoViewer} id="action-close-wrapper">
            <CloseIcon
              className="pointer text-white w-[25px] h-[25px] cursor-pointer hover:text-white-hover"
              id="action-close-icon"
            />
          </div>
        </div>
      </div>
      <div className="flex absolute pb-[70px] desktopMode:pb-0 top-[50px] bottom-0 w-full h-full justify-between items-end desktopMode:items-center p-4">
        <CircleLeftIcon
          onClick={goToPreviousItem}
          className="pointer text-white w-[45px] h-[45px] desktopMode:w-[30px] desktopMode:h-[30px] select-none cursor-pointer hover:text-white-hover"
        />
        <CircleRightIcon
          onClick={goToNextItem}
          className="pointer text-white w-[45px] h-[45px] desktopMode:w-[30px] desktopMode:h-[30px] select-none cursor-pointer hover:text-white-hover"
        />
      </div>
      <div className="max-w-[80vw] max-h-[80vh] flex justify-center items-center z-10">
        {(isVideoLoading || isThumbnailLoading) && <Spinner />}
        {!file.metadata.isVideo && !isThumbnailLoading && (
          <img
            src={thumbnail}
            className="max-w-full max-h-full object-contain select-none"
          />
        )}
        {file.metadata.isVideo && !isVideoLoading && (
          <video
            src={video}
            ref={videoRef}
            className="max-w-full max-h-full object-contain"
            controls
          ></video>
        )}
      </div>
    </div>
  );
});

export default PhotoViewerPopup;
