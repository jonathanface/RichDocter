import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import styles from "./portrait-dropper.module.css";
import { AlertToastType } from "../../types/AlertToasts";
import { useToaster } from "../../hooks/useToaster";

interface PortraitDropperProps {
  imageURL: string | null;
  name: string;
  onImageLoaded?: () => void;
  onComplete?: (files: File[]) => void;
}

const acceptedFileTypes = ["png", "jpg", "jpeg", "gif"];

export const PortraitDropper = (props: PortraitDropperProps) => {
  const [imageURL, setImageURL] = useState(props.imageURL);
  const [name, setName] = useState(props.name);

  const { setAlertState } = useToaster();

  useEffect(() => {
    setImageURL(props.imageURL);
    setName(props.name);
  }, [props.imageURL, props.name]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const droppedFile = acceptedFiles[0];
      if (droppedFile.type) {
        if (!acceptedFileTypes.includes(droppedFile.type.split("image/")[1])) {
          setAlertState({
            title: "Cannot upload file",
            message:
              "Only images of the following type are allowed: " +
              acceptedFileTypes.toString(),
            severity: AlertToastType.warning,
            open: true,
            timeout: 10000,
          });
          return;
        }
      }
      setImageURL(URL.createObjectURL(droppedFile));
      if (props.onComplete) {
        props.onComplete(acceptedFiles);
      }
    },
    [props, setAlertState]
  );

  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  return (
    <div className={styles.portraitDropper}>
      <figure className={styles.portrait}>
        <span {...getRootProps()}>
          <img src={imageURL ? imageURL : undefined} onLoad={props.onImageLoaded ? props.onImageLoaded : undefined} alt={name} title={name} />
          <figcaption>
            Drop an image over the picture to update, or click on it.
            <input {...getInputProps()} />
          </figcaption>
        </span>
      </figure>
    </div>
  );
};
