import { useState, useRef, useEffect } from "react";
import jsPDF from "jspdf";

export default function Home() {
  const [step, setStep] = useState(1);
  const [images, setImages] = useState([]);
  const [pdfName, setPdfName] = useState("");
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [pdfCount, setPdfCount] = useState(0);
  const fileInputRef = useRef(null);

  // Load theme preference on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("pictopdf-theme");
    if (savedTheme) {
      setIsDarkTheme(savedTheme === "dark");
    }

    // Load initial count from API
    fetchPdfCount();

    // Set up real-time updates every 5 seconds
    const interval = setInterval(fetchPdfCount, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch real PDF count from API
  const fetchPdfCount = async () => {
    try {
      const response = await fetch("/api/pdf-count");
      if (response.ok) {
        const data = await response.json();
        setPdfCount(data.count);
      }
    } catch (error) {
      console.error("Failed to fetch PDF count:", error);
      // Fallback to localStorage for offline mode
      const localCount = localStorage.getItem("pdf-counter");
      if (localCount) {
        setPdfCount(parseInt(localCount, 10));
      }
    }
  };

  // Increment PDF count (both API and localStorage)
  const incrementPdfCount = async () => {
    try {
      const response = await fetch("/api/pdf-count", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPdfCount(data.count);
      } else {
        throw new Error("API request failed");
      }
    } catch (error) {
      console.error("Failed to increment PDF count:", error);
      // Fallback to localStorage
      const newCount = pdfCount + 1;
      setPdfCount(newCount);
      localStorage.setItem("pdf-counter", newCount.toString());
    }
  };

  // Theme colors
  const theme = {
    bg: isDarkTheme ? "#000000" : "#ffffff",
    text: isDarkTheme ? "#ffffff" : "#000000",
    textSecondary: isDarkTheme ? "#9CA3AF" : "#6B7280",
    border: isDarkTheme ? "#4B5563" : "#D1D5DB",
    cardBg: isDarkTheme ? "#1F2937" : "#F9FAFB",
    buttonBg: isDarkTheme ? "#ffffff" : "#000000",
    buttonText: isDarkTheme ? "#000000" : "#ffffff",
  };

  // Toggle theme with persistence
  const toggleTheme = () => {
    const newTheme = !isDarkTheme;
    setIsDarkTheme(newTheme);
    localStorage.setItem("pictopdf-theme", newTheme ? "dark" : "light");
  };

  // Open GitHub link
  const openGitHub = () => {
    window.open("https://github.com/tharun30115/img2pdf", "_blank");
  };

  // Refresh app (reset to initial state)
  const refreshApp = () => {
    setStep(1);
    setImages([]);
    setPdfName("");
    setDraggedIndex(null);
  };

  // Handle file selection
  const handleFiles = (files) => {
    const imageFiles = Array.from(files).filter((f) =>
      f.type.startsWith("image/")
    );
    setImages((prev) => [...prev, ...imageFiles]);
    if (step === 1) setStep(2);
  };

  // Handle drag and drop reordering
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newImages = [...images];
    const draggedImage = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(dropIndex, 0, draggedImage);

    setImages(newImages);
    setDraggedIndex(null);
  };

  // PDF Download functionality
  const downloadPDF = async () => {
    if (images.length === 0) return;

    const pdf = new jsPDF();
    let isFirstPage = true;

    for (const image of images) {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      await new Promise((resolve) => {
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          const imgData = canvas.toDataURL("image/jpeg", 0.95);

          if (!isFirstPage) {
            pdf.addPage();
          }

          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const imgAspectRatio = img.width / img.height;
          const pdfAspectRatio = pdfWidth / pdfHeight;

          let renderWidth, renderHeight;

          if (imgAspectRatio > pdfAspectRatio) {
            renderWidth = pdfWidth;
            renderHeight = pdfWidth / imgAspectRatio;
          } else {
            renderHeight = pdfHeight;
            renderWidth = pdfHeight * imgAspectRatio;
          }

          const xOffset = (pdfWidth - renderWidth) / 2;
          const yOffset = (pdfHeight - renderHeight) / 2;

          pdf.addImage(
            imgData,
            "JPEG",
            xOffset,
            yOffset,
            renderWidth,
            renderHeight
          );
          isFirstPage = false;
          resolve();
        };
        img.src = URL.createObjectURL(image);
      });
    }

    // Use "img2pdf" as default name if user doesn't enter anything
    const fileName = pdfName.trim() || "img2pdf";
    pdf.save(`${fileName}.pdf`);

    // Increment the REAL counter (no more fake increments)
    await incrementPdfCount();

    // Reset and go back to start
    setStep(1);
    setImages([]);
    setPdfName("");
  };

  if (step === 1) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: theme.bg,
          color: theme.text,
          fontFamily:
            'JetBrains Mono, Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
          margin: 0,
          padding: 0,
          width: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px 30px",
          }}
        >
          <h1
            style={{
              fontSize: "20px",
              fontWeight: "700",
              margin: 0,
              cursor: "pointer",
              transition: "opacity 0.2s ease",
            }}
            onClick={refreshApp}
            onMouseEnter={(e) => (e.target.style.opacity = "0.7")}
            onMouseLeave={(e) => (e.target.style.opacity = "1")}
            title="Refresh app"
          >
            img2pdf
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            {/* iOS-style Theme Toggle */}
            <div
              style={{
                width: "32px",
                height: "32px",
                backgroundColor: isDarkTheme ? "#2D3748" : "#E2E8F0",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.3s ease",
                border: `2px solid ${isDarkTheme ? "#4A5568" : "#CBD5E0"}`,
                boxShadow: isDarkTheme
                  ? "0 2px 4px rgba(0,0,0,0.3)"
                  : "0 2px 4px rgba(0,0,0,0.1)",
              }}
              onClick={toggleTheme}
              title={`Switch to ${isDarkTheme ? "light" : "dark"} theme`}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isDarkTheme ? "#F7FAFC" : "#2D3748"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {isDarkTheme ? (
                  <>
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </>
                ) : (
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                )}
              </svg>
            </div>
            {/* GitHub Link */}
            <span
              style={{
                fontSize: "14px",
                cursor: "pointer",
                textDecoration: "none",
                opacity: 0.8,
                transition: "opacity 0.2s ease",
              }}
              onClick={openGitHub}
              title="Open GitHub"
              onMouseEnter={(e) => (e.target.style.opacity = "1")}
              onMouseLeave={(e) => (e.target.style.opacity = "0.8")}
            >
              Github
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "40px 20px 0 20px",
          }}
        >
          {/* Title - Mobile Responsive */}
          <h2
            style={{
              fontSize: "48px",
              fontWeight: "700",
              textAlign: "center",
              margin: "0 0 12px 0",
              lineHeight: "1.1",
            }}
          >
            Images to PDF converter
          </h2>

          {/* Subtitle */}
          <p
            style={{
              fontSize: "16px",
              color: theme.textSecondary,
              textAlign: "center",
              margin: "0 0 60px 0",
              maxWidth: "600px",
              lineHeight: "1.5",
            }}
          >
            User friendly web app to convert photos and other images to PDF
            quickly and easily
          </p>

          {/* Upload Area with REAL PDF Counter */}
          <div
            style={{
              border: `2px dashed ${theme.border}`,
              borderRadius: "12px",
              padding: "32px 40px",
              textAlign: "center",
              maxWidth: "420px",
              width: "100%",
              cursor: "pointer",
              transition: "all 0.2s ease",
              backgroundColor: isDarkTheme
                ? "rgba(255,255,255,0.02)"
                : "rgba(0,0,0,0.02)",
            }}
            onClick={() => fileInputRef.current?.click()}
            onDrop={(e) => {
              e.preventDefault();
              handleFiles(e.dataTransfer.files);
            }}
            onDragOver={(e) => e.preventDefault()}
            onMouseEnter={(e) => {
              e.target.style.borderColor = isDarkTheme ? "#6B7280" : "#9CA3AF";
              e.target.style.backgroundColor = isDarkTheme
                ? "rgba(255,255,255,0.05)"
                : "rgba(0,0,0,0.05)";
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = theme.border;
              e.target.style.backgroundColor = isDarkTheme
                ? "rgba(255,255,255,0.02)"
                : "rgba(0,0,0,0.02)";
            }}
          >
            {/* Compact button */}
            <button
              style={{
                backgroundColor: theme.buttonBg,
                color: theme.buttonText,
                border: "none",
                padding: "10px 20px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                marginBottom: "12px",
                transition: "all 0.2s ease",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              Choose files
            </button>

            {/* Compact text section */}
            <div
              style={{
                fontSize: "13px",
                color: theme.textSecondary,
                lineHeight: "1.4",
              }}
            >
              <p style={{ margin: "4px 0" }}>or</p>
              <p style={{ margin: "4px 0 16px 0" }}>
                Drag & Drop your files here
              </p>
              <p style={{ fontSize: "11px", margin: 0, opacity: 0.7 }}>
                • your files are never stored
              </p>
            </div>

            {/* REAL PDF Counter - No More Fake Increments */}
            <div
              style={{
                marginTop: "24px",
                padding: "16px",
                backgroundColor: isDarkTheme
                  ? "rgba(59, 130, 246, 0.1)"
                  : "rgba(59, 130, 246, 0.05)",
                borderRadius: "8px",
                border: `1px solid ${
                  isDarkTheme
                    ? "rgba(59, 130, 246, 0.2)"
                    : "rgba(59, 130, 246, 0.1)"
                }`,
              }}
            >
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: "#3B82F6",
                  marginBottom: "4px",
                }}
              >
                {pdfCount.toLocaleString()}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: theme.textSecondary,
                  opacity: 0.8,
                }}
              >
                PDFs created with img2pdf
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleFiles(e.target.files)}
              style={{ display: "none" }}
            />
          </div>
        </div>

        {/* Footer */}
        <footer
          style={{
            textAlign: "center",
            padding: "30px 20px 20px 20px",
            marginTop: "60px",
          }}
        >
          <p
            style={{
              fontSize: "14px",
              color: theme.text,
              margin: "0 0 8px 0",
              fontWeight: "500",
            }}
          >
            crafted with ✨
          </p>
          <p
            style={{
              fontSize: "12px",
              color: theme.textSecondary,
              margin: 0,
              opacity: 0.6,
            }}
          >
            © img2pdf 2025
          </p>
        </footer>
      </div>
    );
  }

  // Step 2 and Step 3 remain exactly the same as before...
  // [Include the exact same step 2 and step 3 code from the previous version]

  if (step === 2) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: theme.bg,
          color: theme.text,
          fontFamily:
            'JetBrains Mono, Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
          margin: 0,
          padding: 0,
          width: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px 30px",
          }}
        >
          <h1
            style={{
              fontSize: "20px",
              fontWeight: "700",
              margin: 0,
              cursor: "pointer",
              transition: "opacity 0.2s ease",
            }}
            onClick={refreshApp}
            onMouseEnter={(e) => (e.target.style.opacity = "0.7")}
            onMouseLeave={(e) => (e.target.style.opacity = "1")}
            title="Refresh app"
          >
            img2pdf
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                backgroundColor: isDarkTheme ? "#2D3748" : "#E2E8F0",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.3s ease",
                border: `2px solid ${isDarkTheme ? "#4A5568" : "#CBD5E0"}`,
                boxShadow: isDarkTheme
                  ? "0 2px 4px rgba(0,0,0,0.3)"
                  : "0 2px 4px rgba(0,0,0,0.1)",
              }}
              onClick={toggleTheme}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isDarkTheme ? "#F7FAFC" : "#2D3748"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {isDarkTheme ? (
                  <>
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </>
                ) : (
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                )}
              </svg>
            </div>
            <span
              style={{
                fontSize: "14px",
                cursor: "pointer",
                textDecoration: "none",
                opacity: 0.8,
              }}
              onClick={openGitHub}
            >
              Github
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "40px 20px 0 20px",
          }}
        >
          {/* Title - Mobile Responsive */}
          <h2
            style={{
              fontSize: "48px",
              fontWeight: "700",
              textAlign: "center",
              margin: "0 0 12px 0",
              lineHeight: "1.1",
            }}
          >
            Images to PDF converter
          </h2>

          {/* Subtitle */}
          <p
            style={{
              fontSize: "16px",
              color: theme.textSecondary,
              textAlign: "center",
              margin: "0 0 60px 0",
              maxWidth: "600px",
            }}
          >
            User friendly web app to convert photos and other images to PDF
            quickly and easily
          </p>

          {/* Dynamic Image Selection Container */}
          <div
            style={{
              border: `2px dashed ${theme.border}`,
              borderRadius: "12px",
              padding: "28px",
              maxWidth: "420px",
              width: "100%",
              backgroundColor: isDarkTheme
                ? "rgba(255,255,255,0.02)"
                : "rgba(0,0,0,0.02)",
            }}
          >
            {/* Dynamic Image Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))",
                gap: "10px",
                marginBottom: "24px",
                maxWidth: "100%",
              }}
            >
              {/* Render selected images */}
              {images.map((image, index) => (
                <div
                  key={index}
                  style={{
                    aspectRatio: "1",
                    backgroundColor: "transparent",
                    borderRadius: "8px",
                    overflow: "hidden",
                    position: "relative",
                    cursor: "move",
                    transition: "all 0.2s ease",
                    maxWidth: "100px",
                    border: `2px solid ${theme.border}`,
                  }}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                >
                  <img
                    src={URL.createObjectURL(image)}
                    alt={`Image ${index + 1}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                  {/* Remove button */}
                  <button
                    onClick={() =>
                      setImages((prev) =>
                        prev.filter((_, idx) => idx !== index)
                      )
                    }
                    style={{
                      position: "absolute",
                      top: "3px",
                      right: "3px",
                      width: "18px",
                      height: "18px",
                      backgroundColor: "#EF4444",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "50%",
                      fontSize: "11px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: 0.9,
                    }}
                  >
                    ×
                  </button>
                  {/* Order number */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: "3px",
                      left: "3px",
                      width: "16px",
                      height: "16px",
                      backgroundColor: "rgba(0,0,0,0.7)",
                      color: "#ffffff",
                      borderRadius: "50%",
                      fontSize: "9px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                    }}
                  >
                    {index + 1}
                  </div>
                </div>
              ))}

              {/* Add more button */}
              <div
                style={{
                  aspectRatio: "1",
                  backgroundColor: theme.cardBg,
                  border: `2px dashed ${theme.border}`,
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  color: theme.text,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  maxWidth: "100px",
                  minWidth: "80px",
                }}
                onClick={() => fileInputRef.current?.click()}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = isDarkTheme
                    ? "#6B7280"
                    : "#9CA3AF";
                  e.target.style.backgroundColor = isDarkTheme
                    ? "#374151"
                    : "#E5E7EB";
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = theme.border;
                  e.target.style.backgroundColor = theme.cardBg;
                }}
              >
                +
              </div>
            </div>

            {/* Helper text */}
            <p
              style={{
                fontSize: "11px",
                color: theme.textSecondary,
                textAlign: "center",
                margin: "0 0 20px 0",
                opacity: 0.7,
              }}
            >
              Drag images to reorder • Click + to add more
            </p>

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  marginBottom: "6px",
                  color: theme.text,
                  fontWeight: "500",
                }}
              >
                Optional Name:
              </label>
              <input
                type="text"
                value={pdfName}
                onChange={(e) => setPdfName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  backgroundColor: theme.cardBg,
                  border: `1px solid ${theme.border}`,
                  borderRadius: "8px",
                  color: theme.text,
                  fontSize: "13px",
                  fontFamily: "inherit",
                  transition: "border-color 0.2s ease",
                }}
                placeholder="Enter PDF name..."
              />
            </div>

            <button
              onClick={() => setStep(3)}
              disabled={images.length === 0}
              style={{
                width: "100%",
                backgroundColor:
                  images.length > 0 ? theme.buttonBg : theme.cardBg,
                color:
                  images.length > 0 ? theme.buttonText : theme.textSecondary,
                border: "none",
                padding: "12px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: images.length > 0 ? "pointer" : "not-allowed",
                transition: "all 0.2s ease",
                boxShadow:
                  images.length > 0 ? "0 2px 4px rgba(0,0,0,0.1)" : "none",
              }}
            >
              Convert to PDF
            </button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleFiles(e.target.files)}
              style={{ display: "none" }}
            />
          </div>
        </div>

        {/* Footer */}
        <footer
          style={{
            textAlign: "center",
            padding: "30px 20px 20px 20px",
            marginTop: "60px",
          }}
        >
          <p
            style={{
              fontSize: "14px",
              color: theme.text,
              margin: "0 0 8px 0",
              fontWeight: "500",
            }}
          >
            crafted with ✨
          </p>
          <p
            style={{
              fontSize: "12px",
              color: theme.textSecondary,
              margin: 0,
              opacity: 0.6,
            }}
          >
            © img2pdf 2025
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: theme.bg,
        color: theme.text,
        fontFamily:
          'JetBrains Mono, Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
        margin: 0,
        padding: 0,
        width: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 30px",
        }}
      >
        <h1
          style={{
            fontSize: "20px",
            fontWeight: "700",
            margin: 0,
            cursor: "pointer",
            transition: "opacity 0.2s ease",
          }}
          onClick={refreshApp}
          onMouseEnter={(e) => (e.target.style.opacity = "0.7")}
          onMouseLeave={(e) => (e.target.style.opacity = "1")}
          title="Refresh app"
        >
          img2pdf
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              backgroundColor: isDarkTheme ? "#2D3748" : "#E2E8F0",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.3s ease",
              border: `2px solid ${isDarkTheme ? "#4A5568" : "#CBD5E0"}`,
              boxShadow: isDarkTheme
                ? "0 2px 4px rgba(0,0,0,0.3)"
                : "0 2px 4px rgba(0,0,0,0.1)",
            }}
            onClick={toggleTheme}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke={isDarkTheme ? "#F7FAFC" : "#2D3748"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {isDarkTheme ? (
                <>
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </>
              ) : (
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              )}
            </svg>
          </div>
          <span
            style={{
              fontSize: "14px",
              cursor: "pointer",
              textDecoration: "underline",
              opacity: 0.8,
            }}
            onClick={openGitHub}
          >
            Github
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "40px 20px 0 20px",
        }}
      >
        {/* Title - Mobile Responsive */}
        <h2
          style={{
            fontSize: "48px",
            fontWeight: "700",
            textAlign: "center",
            margin: "0 0 12px 0",
            lineHeight: "1.1",
          }}
        >
          Images to PDF converter
        </h2>

        {/* Subtitle */}
        <p
          style={{
            fontSize: "16px",
            color: theme.textSecondary,
            textAlign: "center",
            margin: "0 0 60px 0",
            maxWidth: "600px",
          }}
        >
          User friendly web app to convert photos and other images to PDF
          quickly and easily
        </p>

        {/* Download Container */}
        <div
          style={{
            border: `2px dashed ${theme.border}`,
            borderRadius: "12px",
            padding: "36px",
            textAlign: "center",
            maxWidth: "340px",
            width: "100%",
            backgroundColor: isDarkTheme
              ? "rgba(255,255,255,0.02)"
              : "rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>📄</div>
          <p
            style={{
              fontSize: "16px",
              marginBottom: "24px",
              fontWeight: "500",
            }}
          >
            {pdfName.trim() || "img2pdf"}.pdf
          </p>

          <button
            onClick={downloadPDF}
            style={{
              width: "100%",
              backgroundColor: theme.buttonBg,
              color: theme.buttonText,
              border: "none",
              padding: "12px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            Download PDF
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer
        style={{
          textAlign: "center",
          padding: "30px 20px 20px 20px",
          marginTop: "60px",
        }}
      >
        <p
          style={{
            fontSize: "14px",
            color: theme.text,
            margin: "0 0 8px 0",
            fontWeight: "500",
          }}
        >
          crafted with ✨
        </p>
        <p
          style={{
            fontSize: "12px",
            color: theme.textSecondary,
            margin: 0,
            opacity: 0.6,
          }}
        >
          © img2pdf 2025
        </p>
      </footer>
    </div>
  );
}
