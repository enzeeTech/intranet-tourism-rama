import React, { useState, useRef, useCallback } from "react";
import Cropper from "react-easy-crop";
import getCroppedImg from "./cropImage"; // Assume you have this utility to crop the image

function Popup({ title, onClose, onSave, profileData, id, formData, csrfToken, authToken, setPhoto }) {
  const [fileNames, setFileNames] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [croppedImage, setCroppedImage] = useState(null);
  const fileInputRef = useRef(null);

  const handleClickImg = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const fileUrl = URL.createObjectURL(file);
      setSelectedFile(file);
      setCroppedImage(fileUrl); // Set the file URL as the initial cropped image
    }
  };

  const handleCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropImage = async () => {
    try {
      const croppedImg = await getCroppedImg(croppedImage, croppedAreaPixels);
      setCroppedImage(croppedImg); // Set the cropped image as the preview
    } catch (e) {
      console.error("Error cropping image:", e);
    }
  };

  const handleSave = async () => {
    if (!croppedImage) {
      console.error("No cropped image to save");
      return;
    }

    try {
      const response = await fetch(croppedImage);
      const blob = await response.blob();
      const file = new File([blob], 'profile.jpg', { type: blob.type });

      const FfData = new FormData();
      FfData.append("cover_photo", file);
      FfData.append("user_id", id);
      FfData.append("_method", "PUT");
      FfData.append("name", formData.name);

      const url = `/api/profile/profiles/${profileData.profile.id}?with[]=user`;

      const uploadResponse = await fetch(url, {
        method: "POST",
        body: FfData,
        headers: {
          Accept: "application/json",
          "X-CSRF-TOKEN": csrfToken || "",
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.message || "Error uploading file");
      }

      const data = await uploadResponse.json();
      if (data.success) {
        setPhoto(croppedImage); // Update the photo URL with the cropped image
        onSave(); // Trigger the onSave callback
        console.log("File uploaded successfully:", data);
        window.location.reload();
      } else {
        console.error("Error uploading file:", data);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      window.location.reload();
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-50"
      onClick={onClose}
    >
      <div
        className="flex flex-col py-4 px-8 bg-white rounded-3xl shadow-custom max-w-[600px]" // Increased max width for larger crop area
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-neutral-800">
          <div className="text-xl font-bold">{title}</div>
          <div className="flex gap-5 mt-4 text-base font-medium">
            {croppedImage ? (
              <div className="relative w-[500px] h-[400px]"> {/* Larger cropper area */}
                <Cropper
                  image={croppedImage}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onCropComplete={handleCropComplete}
                  onZoomChange={setZoom}
                />
              </div>
            ) : (
              <img
                loading="lazy"
                src="https://cdn.builder.io/api/v1/image/assets/TEMP/6f866987dac766e7c7baf2f103208e42a078a207c09f4684986fefda5837d21a?"
                className="shrink-0 aspect-square w-[27px] cursor-pointer"
                onClick={handleClickImg}
              />
            )}
          </div>
          <div
            className="flex-auto my-auto cursor-pointer mt-5" // Moved below and added margin-top for spacing
            onClick={handleClickImg}
          >
            Choose photo from the device
          </div>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
        </div>
        <div className="flex gap-2 self-end mt-3.5 mb-4 font-bold text-center">
          <div
            className="file-names-container flex flex-wrap gap-2"
            style={{
              maxWidth: "150px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {fileNames.map((name, index) => (
              <div
                className="flex items-center px-2 py-1 bg-white rounded-2xl shadow"
                key={index}
                style={{
                  maxWidth: "150px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                <div className="file-name text-xs truncate">{name}</div>
              </div>
            ))}
          </div>
          <button
            className="bg-white text-sm text-gray-400 border border-gray-400 hover:bg-gray-400 hover:text-white px-4 py-2 rounded-full"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="bg-blue-500 hover:bg-blue-700 text-sm text-white px-4 py-2 rounded-full"
            onClick={handleCropImage}
          >
            Crop
          </button>
          <button
            className="bg-green-500 hover:bg-green-700 text-sm text-white px-4 py-2 rounded-full"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default Popup;
