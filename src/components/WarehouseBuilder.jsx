import React, { useState, useRef, useCallback } from "react";
import { Plus, Minus, Download, Trash2, Move, RotateCw } from "lucide-react";

const WarehouseBuilder = () => {
  const [aisles, setAisles] = useState([]);
  const [selectedAisle, setSelectedAisle] = useState(null);
  const [selectedBay, setSelectedBay] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [currentDraw, setCurrentDraw] = useState({ x: 0, y: 0 });
  const [showBays, setShowBays] = useState({});
  const [nextAisleNumber, setNextAisleNumber] = useState(1);

  // Form data
  const [formData, setFormData] = useState({
    zone: "A",
    height: 1500,
    width: 1000,
    depth: 1200,
    aisleType: "double-sided", // 'single-sided' or 'double-sided'
  });

  const canvasRef = useRef(null);
  const GRID_SIZE = 20;
  const CANVAS_WIDTH = 1000;
  const CANVAS_HEIGHT = 700;

  // Utility functions
  const snapToGrid = (value) => Math.round(value / GRID_SIZE) * GRID_SIZE;

  const generateAisleId = () => `aisle_${Date.now()}_${Math.random()}`;

  // Mouse event handlers for drawing aisles
  const handleMouseDown = useCallback((e) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = snapToGrid(e.clientX - rect.left);
    const y = snapToGrid(e.clientY - rect.top);

    setIsDrawing(true);
    setDrawStart({ x, y });
    setCurrentDraw({ x, y });
  }, []);

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDrawing || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = snapToGrid(e.clientX - rect.left);
      const y = snapToGrid(e.clientY - rect.top);

      setCurrentDraw({ x, y });
    },
    [isDrawing]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing) return;

    const width = Math.abs(currentDraw.x - drawStart.x);
    const height = Math.abs(currentDraw.y - drawStart.y);

    // Only create aisle if it's big enough
    if (width >= GRID_SIZE * 2 && height >= GRID_SIZE * 2) {
      const newAisle = {
        id: generateAisleId(),
        number: String(nextAisleNumber).padStart(2, "0"),
        x: Math.min(drawStart.x, currentDraw.x),
        y: Math.min(drawStart.y, currentDraw.y),
        width,
        height,
        type: formData.aisleType,
        sections: Math.floor(width / (GRID_SIZE * 2)), // Approximate sections based on width
        baysPerSection: 5, // Default
        zone: formData.zone,
        bays: [],
      };

      // Generate initial bays
      newAisle.bays = generateBaysForAisle(newAisle);

      setAisles((prev) => [...prev, newAisle]);
      setNextAisleNumber((prev) => prev + 1);
    }

    setIsDrawing(false);
    setDrawStart({ x: 0, y: 0 });
    setCurrentDraw({ x: 0, y: 0 });
  }, [isDrawing, drawStart, currentDraw, nextAisleNumber, formData]);

  // Generate bays for an aisle
  const generateBaysForAisle = (aisle) => {
    const bays = [];
    const { sections, baysPerSection, type } = aisle;

    for (let section = 1; section <= sections; section++) {
      if (type === "double-sided") {
        // Double-sided: odd numbers on one side, even on the other
        for (let level = 1; level <= baysPerSection; level++) {
          // Left side (odd numbers)
          bays.push({
            id: `${aisle.id}_${section}_${level * 2 - 1}`,
            section: String(section).padStart(2, "0"),
            bay: String(level * 2 - 1).padStart(2, "0"),
            side: "left",
            level: level,
            x: aisle.x + (section - 1) * (aisle.width / sections),
            y: aisle.y - level * 25, // Stack upward
            width: aisle.width / sections / 2 - 2,
            height: 20,
          });

          // Right side (even numbers)
          bays.push({
            id: `${aisle.id}_${section}_${level * 2}`,
            section: String(section).padStart(2, "0"),
            bay: String(level * 2).padStart(2, "0"),
            side: "right",
            level: level,
            x:
              aisle.x +
              (section - 1) * (aisle.width / sections) +
              aisle.width / sections / 2 +
              2,
            y: aisle.y - level * 25, // Stack upward
            width: aisle.width / sections / 2 - 2,
            height: 20,
          });
        }
      } else {
        // Single-sided: sequential numbering
        for (let bay = 1; bay <= baysPerSection; bay++) {
          bays.push({
            id: `${aisle.id}_${section}_${bay}`,
            section: String(section).padStart(2, "0"),
            bay: String(bay).padStart(2, "0"),
            side: "single",
            level: bay,
            x: aisle.x + (section - 1) * (aisle.width / sections),
            y: aisle.y - bay * 25, // Stack upward
            width: aisle.width / sections - 2,
            height: 20,
          });
        }
      }
    }

    return bays;
  };

  // Add bay level to aisle
  const addBayLevel = (aisleId) => {
    setAisles((prev) =>
      prev.map((aisle) => {
        if (aisle.id === aisleId) {
          const newBaysPerSection = aisle.baysPerSection + 1;
          const updatedAisle = { ...aisle, baysPerSection: newBaysPerSection };
          updatedAisle.bays = generateBaysForAisle(updatedAisle);
          return updatedAisle;
        }
        return aisle;
      })
    );
  };

  // Remove bay level from aisle
  const removeBayLevel = (aisleId) => {
    setAisles((prev) =>
      prev.map((aisle) => {
        if (aisle.id === aisleId && aisle.baysPerSection > 1) {
          const newBaysPerSection = aisle.baysPerSection - 1;
          const updatedAisle = { ...aisle, baysPerSection: newBaysPerSection };
          updatedAisle.bays = generateBaysForAisle(updatedAisle);
          return updatedAisle;
        }
        return aisle;
      })
    );
  };

  // Toggle bay visibility for aisle
  const toggleBayVisibility = (aisleId) => {
    setShowBays((prev) => ({
      ...prev,
      [aisleId]: !prev[aisleId],
    }));
  };

  // Delete aisle
  const deleteAisle = (aisleId) => {
    setAisles((prev) => prev.filter((aisle) => aisle.id !== aisleId));
    setShowBays((prev) => {
      const updated = { ...prev };
      delete updated[aisleId];
      return updated;
    });
    if (selectedAisle === aisleId) {
      setSelectedAisle(null);
    }
  };

  // Toggle aisle type
  const toggleAisleType = (aisleId) => {
    setAisles((prev) =>
      prev.map((aisle) => {
        if (aisle.id === aisleId) {
          const newType =
            aisle.type === "single-sided" ? "double-sided" : "single-sided";
          const updatedAisle = { ...aisle, type: newType };
          updatedAisle.bays = generateBaysForAisle(updatedAisle);
          return updatedAisle;
        }
        return aisle;
      })
    );
  };

  // Export to CSV
  const exportToCSV = () => {
    if (aisles.length === 0) {
      alert("No aisles to export. Draw some aisles first!");
      return;
    }

    let csv =
      "Zone,Aisle,Section,Bay,Location Code,Height(mm),Width(mm),Depth(mm),Aisle Type\n";

    aisles.forEach((aisle) => {
      aisle.bays.forEach((bay) => {
        const locationCode = `${aisle.zone}${aisle.number}-${bay.section}-${bay.bay}`;
        csv += `${aisle.zone},${aisle.number},${bay.section},${bay.bay},${locationCode},${formData.height},${formData.width},${formData.depth},${aisle.type}\n`;
      });
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `warehouse_${formData.zone}_locations.csv`;
    link.click();
  };

  // Clear all
  const clearAll = () => {
    if (window.confirm("Are you sure you want to clear all aisles?")) {
      setAisles([]);
      setShowBays({});
      setSelectedAisle(null);
      setSelectedBay(null);
      setNextAisleNumber(1);
    }
  };

  return (
    <div className="warehouse-builder">
      <div className="header">
        <h1>Visual Warehouse Location Builder</h1>
        <p>Draw rectangles to create aisles, then click to add bays</p>
      </div>

      <div className="main-container">
        {/* Control Panel */}
        <div className="control-panel">
          <div className="form-section">
            <h3>Configuration</h3>

            <div className="form-group">
              <label>Zone:</label>
              <input
                type="text"
                value={formData.zone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, zone: e.target.value }))
                }
                placeholder="A"
              />
            </div>

            <div className="form-group">
              <label>Default Aisle Type:</label>
              <select
                value={formData.aisleType}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    aisleType: e.target.value,
                  }))
                }
              >
                <option value="double-sided">Double-sided (odd/even)</option>
                <option value="single-sided">Single-sided (sequential)</option>
              </select>
            </div>

            <div className="dimensions-grid">
              <div className="form-group">
                <label>Height (mm):</label>
                <input
                  type="number"
                  value={formData.height}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      height: parseInt(e.target.value),
                    }))
                  }
                />
              </div>

              <div className="form-group">
                <label>Width (mm):</label>
                <input
                  type="number"
                  value={formData.width}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      width: parseInt(e.target.value),
                    }))
                  }
                />
              </div>

              <div className="form-group">
                <label>Depth (mm):</label>
                <input
                  type="number"
                  value={formData.depth}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      depth: parseInt(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="actions">
            <button onClick={exportToCSV} className="btn btn-success">
              <Download size={16} /> Export CSV
            </button>
            <button onClick={clearAll} className="btn btn-danger">
              <Trash2 size={16} /> Clear All
            </button>
          </div>

          {/* Aisle List */}
          <div className="aisle-list">
            <h3>Aisles ({aisles.length})</h3>
            {aisles.map((aisle) => (
              <div key={aisle.id} className="aisle-item">
                <div className="aisle-header">
                  <span className="aisle-name">
                    {formData.zone}
                    {aisle.number} ({aisle.type})
                  </span>
                  <div className="aisle-controls">
                    <button
                      onClick={() => toggleBayVisibility(aisle.id)}
                      className="btn btn-sm"
                      title="Toggle bay visibility"
                    >
                      {showBays[aisle.id] ? "Hide" : "Show"} Bays
                    </button>
                  </div>
                </div>

                {showBays[aisle.id] && (
                  <div className="bay-controls">
                    <div className="bay-level-controls">
                      <button
                        onClick={() => addBayLevel(aisle.id)}
                        className="btn btn-sm btn-success"
                        title="Add bay level"
                      >
                        <Plus size={14} />
                      </button>
                      <span>{aisle.baysPerSection} levels</span>
                      <button
                        onClick={() => removeBayLevel(aisle.id)}
                        className="btn btn-sm btn-danger"
                        title="Remove bay level"
                        disabled={aisle.baysPerSection <= 1}
                      >
                        <Minus size={14} />
                      </button>
                    </div>

                    <button
                      onClick={() => toggleAisleType(aisle.id)}
                      className="btn btn-sm"
                      title="Toggle aisle type"
                    >
                      <RotateCw size={14} /> Switch Type
                    </button>

                    <button
                      onClick={() => deleteAisle(aisle.id)}
                      className="btn btn-sm btn-danger"
                      title="Delete aisle"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Canvas Area */}
        <div className="canvas-container">
          <h3>Warehouse Layout</h3>
          <p className="canvas-instructions">
            Click and drag to draw aisles • Click aisle names to show/hide bays
          </p>

          <svg
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="warehouse-canvas"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => setIsDrawing(false)}
          >
            {/* Grid */}
            <defs>
              <pattern
                id="grid"
                width={GRID_SIZE}
                height={GRID_SIZE}
                patternUnits="userSpaceOnUse"
              >
                <path
                  d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`}
                  fill="none"
                  stroke="#e0e0e0"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Current drawing rectangle */}
            {isDrawing && (
              <rect
                x={Math.min(drawStart.x, currentDraw.x)}
                y={Math.min(drawStart.y, currentDraw.y)}
                width={Math.abs(currentDraw.x - drawStart.x)}
                height={Math.abs(currentDraw.y - drawStart.y)}
                fill="rgba(76, 175, 80, 0.3)"
                stroke="#4CAF50"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            )}

            {/* Rendered aisles */}
            {aisles.map((aisle) => (
              <g key={aisle.id}>
                {/* Aisle rectangle */}
                <rect
                  x={aisle.x}
                  y={aisle.y}
                  width={aisle.width}
                  height={aisle.height}
                  fill={
                    selectedAisle === aisle.id
                      ? "rgba(255, 107, 53, 0.3)"
                      : "rgba(76, 175, 80, 0.3)"
                  }
                  stroke={selectedAisle === aisle.id ? "#ff6b35" : "#4CAF50"}
                  strokeWidth="2"
                  className="aisle-rect"
                  onClick={() => {
                    setSelectedAisle(aisle.id);
                    toggleBayVisibility(aisle.id);
                  }}
                />

                {/* Aisle label */}
                <text
                  x={aisle.x + aisle.width / 2}
                  y={aisle.y + aisle.height / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="aisle-label"
                  fill="#333"
                  fontSize="14"
                  fontWeight="bold"
                >
                  {formData.zone}
                  {aisle.number}
                </text>

                {/* Bays */}
                {showBays[aisle.id] &&
                  aisle.bays.map((bay) => (
                    <g key={bay.id}>
                      <rect
                        x={bay.x}
                        y={bay.y}
                        width={bay.width}
                        height={bay.height}
                        fill={selectedBay === bay.id ? "#ff6b35" : "#2196F3"}
                        stroke="#1976D2"
                        strokeWidth="1"
                        className="bay-rect"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBay(bay.id);
                        }}
                      />
                      <text
                        x={bay.x + bay.width / 2}
                        y={bay.y + bay.height / 2}
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="bay-label"
                        fill="white"
                        fontSize="10"
                        fontWeight="bold"
                      >
                        {bay.bay}
                      </text>
                    </g>
                  ))}
              </g>
            ))}
          </svg>
        </div>
      </div>

      <style jsx>{`
        .warehouse-builder {
          padding: 20px;
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
          max-width: 1400px;
          margin: 0 auto;
        }

        .header {
          text-align: center;
          margin-bottom: 20px;
        }

        .header h1 {
          color: #333;
          margin-bottom: 10px;
        }

        .header p {
          color: #666;
          margin: 0;
        }

        .main-container {
          display: flex;
          gap: 20px;
          align-items: flex-start;
        }

        .control-panel {
          width: 300px;
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          max-height: 800px;
          overflow-y: auto;
        }

        .canvas-container {
          flex: 1;
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .canvas-instructions {
          color: #666;
          margin-bottom: 15px;
          font-size: 14px;
        }

        .form-section h3 {
          margin-top: 0;
          margin-bottom: 15px;
          color: #333;
        }

        .form-group {
          margin-bottom: 15px;
        }

        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
          color: #555;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .dimensions-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }

        .actions {
          margin: 20px 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 15px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          justify-content: center;
        }

        .btn:hover {
          transform: translateY(-1px);
        }

        .btn-success {
          background: #28a745;
          color: white;
        }

        .btn-success:hover {
          background: #218838;
        }

        .btn-danger {
          background: #dc3545;
          color: white;
        }

        .btn-danger:hover {
          background: #c82333;
        }

        .btn-sm {
          padding: 5px 10px;
          font-size: 12px;
        }

        .aisle-list {
          margin-top: 20px;
        }

        .aisle-item {
          border: 1px solid #eee;
          border-radius: 4px;
          margin-bottom: 10px;
          overflow: hidden;
        }

        .aisle-header {
          padding: 10px;
          background: #f8f9fa;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .aisle-name {
          font-weight: 500;
          color: #333;
        }

        .bay-controls {
          padding: 10px;
          background: white;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .bay-level-controls {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .warehouse-canvas {
          border: 2px solid #ddd;
          border-radius: 4px;
          background: white;
          cursor: crosshair;
        }

        .aisle-rect {
          cursor: pointer;
        }

        .aisle-rect:hover {
          opacity: 0.8;
        }

        .bay-rect {
          cursor: pointer;
        }

        .bay-rect:hover {
          opacity: 0.8;
        }

        .aisle-label {
          pointer-events: none;
          user-select: none;
        }

        .bay-label {
          pointer-events: none;
          user-select: none;
        }
      `}</style>
    </div>
  );
};

export default WarehouseBuilder;
