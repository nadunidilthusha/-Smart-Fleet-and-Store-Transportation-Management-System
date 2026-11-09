import { useRef } from "react";

// Accepted MIME types for registration papers and vehicle photos
const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

// Human-readable file size helper for the selected file list
const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function VehicleDocumentUpload({
  documents,
  error,
  onFilesChange,
  disabled = false,
}) {
  // Keep a stable reference to the hidden file input for programmatic clicks
  const fileInputRef = useRef(null);

  // Open the native file picker when browse is activated
  const openFilePicker = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  // Merge newly chosen files into the existing document list
  const handleFileSelection = (event) => {
    const selected = Array.from(event.target.files || []);
    const accepted = selected.filter((file) => ACCEPTED_TYPES.includes(file.type));
    onFilesChange([...(documents || []), ...accepted]);
    // Reset the input so the same file can be re-selected later if removed
    event.target.value = "";
  };

  // Support drag-and-drop uploads onto the dashed dropzone
  const handleDrop = (event) => {
    event.preventDefault();
    if (disabled) return;
    const dropped = Array.from(event.dataTransfer.files || []);
    const accepted = dropped.filter((file) => ACCEPTED_TYPES.includes(file.type));
    if (accepted.length) {
      onFilesChange([...(documents || []), ...accepted]);
    }
  };

  // Remove a single document by index from the upload list
  const removeDocument = (index) => {
    onFilesChange(documents.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={openFilePicker}
        onKeyDown={(event) => {
          // Activate the file picker with Enter or Space for keyboard users
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openFilePicker();
          }
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        className={[
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-12 text-center transition",
          "hover:border-blue-400 hover:bg-blue-50/40",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
          disabled ? "cursor-not-allowed opacity-50" : "",
          error ? "border-red-300 bg-red-50/40" : "border-slate-200 bg-slate-50",
        ].join(" ")}
      >
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 18a4.5 4.5 0 01.6-9 6 6 0 0111.3 1.7A3.5 3.5 0 0118.5 18H7z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 13V8m0 0l-2 2m2-2l2 2" />
          </svg>
        </span>
        <p className="text-sm text-slate-600">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openFilePicker();
            }}
            className="font-semibold text-blue-600 hover:underline"
          >
            Click to browse file
          </button>
          <span className="text-slate-500"> or drag and drop</span>
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Upload vehicle registration papers or photo (PNG, JPG, PDF up to 10MB).
        </p>
      </div>

      {/* Hidden native file input driven by the dropzone */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelection}
        disabled={disabled}
      />

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {/* Selected file chips with remove actions */}
      {documents?.length > 0 && (
        <ul className="mt-3 space-y-2">
          {documents.map((file, index) => (
            <li
              key={`${file.name}-${file.lastModified}-${index}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">{file.name}</p>
                <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => removeDocument(index)}
                disabled={disabled}
                className="shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
