import { Image, X } from "lucide-react";
import { useState } from "react";

function fileLabel(file) {
  if (!file) {
    return "Selected file";
  }

  return file.name || file.label || file.url || "Selected file";
}

function FileUploadField({
  accept = "image/*",
  currentFiles = [],
  files = [],
  label,
  multiple = false,
  onChange,
  onRemoveCurrent,
  onRemoveFile,
}) {
  const [inputKey, setInputKey] = useState(0);
  const selectedFiles = Array.isArray(files) ? files.filter(Boolean) : [files].filter(Boolean);

  const resetInput = () => setInputKey((current) => current + 1);

  const handleChange = (event) => {
    const nextFiles = Array.from(event.target.files || []);
    onChange(multiple ? nextFiles : nextFiles[0] || null);
  };

  const removeSelected = (file, index) => {
    onRemoveFile(file, index);
    resetInput();
  };

  const removeCurrent = (file) => {
    onRemoveCurrent(file);
    resetInput();
  };

  return (
    <div className="file-field upload-field">
      <label>
        {label}
        <input accept={accept} key={inputKey} multiple={multiple} onChange={handleChange} type="file" />
      </label>

      {(currentFiles.length > 0 || selectedFiles.length > 0) && (
        <div className="upload-preview-list">
          {currentFiles.map((file) => (
            <div className="upload-preview-item" key={file.id || file.url}>
              {file.url ? <img alt={file.name || label} src={file.url} /> : <Image size={18} />}
              <span>{file.name || "Current upload"}</span>
              <button onClick={() => removeCurrent(file)} type="button">
                <X size={14} /> Remove
              </button>
            </div>
          ))}
          {selectedFiles.map((file, index) => (
            <div className="upload-preview-item" key={`${fileLabel(file)}-${index}`}>
              <Image size={18} />
              <span>{fileLabel(file)}</span>
              <button onClick={() => removeSelected(file, index)} type="button">
                <X size={14} /> Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FileUploadField;
