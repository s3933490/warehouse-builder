import React, { useState, useRef, useCallback } from "react";
import {
  Download,
  Trash2,
  Edit3,
  Check,
  X,
  Plus,
  Minus,
  Copy,
  Save,
  Upload,
  Grid3X3,
  Eye,
  EyeOff,
  Move,
} from "lucide-react";
import "../styles/WarehouseBuilder.css";

const WarehouseBuilder = () => {
  const [gridSize, setGridSize] = useState({ rows: 20, cols: 25 });
  const [placedAisles, setPlacedAisles] = useState({});
  const [selectedAisle, setSelectedAisle] = useState(null);
  const [nextAisleId, setNextAisleId] = useState(1);
  const fileInputRef = useRef(null);

  // Drawing state
  const [drawingMode, setDrawingMode] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [previewArea, setPreviewArea] = useState(null);

  // Drag state
  const [dragMode, setDragMode] = useState(false);
  const [draggingAisle, setDraggingAisle] = useState(null);
  const [dragOffset, setDragOffset] = useState({ row: 0, col: 0 });
  const [dragPreview, setDragPreview] = useState(null);

  // Edit state
  const [editingAisle, setEditingAisle] = useState(null);
  const [editValues, setEditValues] = useState({});

  // View options
  const [showBayDetails, setShowBayDetails] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  // Form data
  const [formData, setFormData] = useState({
    zone: "A",
    height: 1500,
    width: 1000,
    depth: 1200,
    defaultBaysHigh: 5,
  });

  // Start drawing mode
  const startDrawing = useCallback(() => {
    setDrawingMode(true);
    setDragMode(false);
    setStartPoint(null);
    setPreviewArea(null);
    setDraggingAisle(null);
    setDragPreview(null);
  }, []);

  // Start drag mode
  const startDragging = useCallback(() => {
    setDragMode(true);
    setDrawingMode(false);
    setStartPoint(null);
    setPreviewArea(null);
    setDraggingAisle(null);
    setDragPreview(null);
  }, []);

  // Cancel drawing mode
  const cancelDrawing = useCallback(() => {
    setDrawingMode(false);
    setStartPoint(null);
    setPreviewArea(null);
  }, []);

  // Cancel drag mode
  const cancelDragging = useCallback(() => {
    setDragMode(false);
    setDraggingAisle(null);
    setDragPreview(null);
  }, []);

  // Handle grid cell click
  const handleGridClick = useCallback(
    (row, col) => {
      if (dragMode) {
        const aisle = getAisleAtPosition(row, col);
        if (aisle && !draggingAisle) {
          // Start dragging this aisle
          setDraggingAisle(aisle);
          setDragOffset({
            row: row - aisle.gridRow,
            col: col - aisle.gridCol,
          });
          return;
        }

        if (draggingAisle && dragPreview) {
          // Drop the aisle
          const newRow = dragPreview.row;
          const newCol = dragPreview.col;

          // Check if drop position is valid
          const wouldOverlap = Object.values(placedAisles).some(
            (existingAisle) => {
              if (existingAisle.id === draggingAisle.id) return false;

              const aisleEndRow = existingAisle.gridRow + existingAisle.height;
              const aisleEndCol = existingAisle.gridCol + existingAisle.width;
              const newEndRow = newRow + draggingAisle.height;
              const newEndCol = newCol + draggingAisle.width;

              return !(
                newRow >= aisleEndRow ||
                newEndRow <= existingAisle.gridRow ||
                newCol >= aisleEndCol ||
                newEndCol <= existingAisle.gridCol
              );
            }
          );

          if (
            !wouldOverlap &&
            newRow >= 0 &&
            newCol >= 0 &&
            newRow + draggingAisle.height <= gridSize.rows &&
            newCol + draggingAisle.width <= gridSize.cols
          ) {
            // Update aisle position
            setPlacedAisles((prev) => ({
              ...prev,
              [draggingAisle.id]: {
                ...prev[draggingAisle.id],
                gridRow: newRow,
                gridCol: newCol,
              },
            }));
          }

          setDraggingAisle(null);
          setDragPreview(null);
        }
        return;
      }

      if (!drawingMode) return;

      if (!startPoint) {
        setStartPoint({ row, col });
      } else {
        const isHorizontal = row === startPoint.row;
        const isVertical = col === startPoint.col;

        if (!isHorizontal && !isVertical) {
          alert(
            "Aisles must be straight - either horizontal (same row) or vertical (same column)"
          );
          return;
        }

        let width, height, topRow, leftCol;

        if (isHorizontal) {
          width = Math.abs(col - startPoint.col) + 1;
          height = 1;
          topRow = row;
          leftCol = Math.min(startPoint.col, col);
        } else {
          width = 1;
          height = Math.abs(row - startPoint.row) + 1;
          topRow = Math.min(startPoint.row, row);
          leftCol = col;
        }

        // Check for overlap
        const wouldOverlap = Object.values(placedAisles).some((aisle) => {
          const aisleEndRow = aisle.gridRow + aisle.height;
          const aisleEndCol = aisle.gridCol + aisle.width;
          const newEndRow = topRow + height;
          const newEndCol = leftCol + width;

          return !(
            topRow >= aisleEndRow ||
            newEndRow <= aisle.gridRow ||
            leftCol >= aisleEndCol ||
            newEndCol <= aisle.gridCol
          );
        });

        if (wouldOverlap) {
          alert("This area overlaps with an existing aisle!");
          return;
        }

        // Create new aisle
        const newAisleId = `aisle-${nextAisleId}`;
        const newAisle = {
          id: newAisleId,
          number: String(nextAisleId).padStart(2, "0"),
          width,
          height,
          sections: isHorizontal ? width : height,
          baysHigh: formData.defaultBaysHigh,
          gridRow: topRow,
          gridCol: leftCol,
          zone: formData.zone,
          color: generateAisleColor(nextAisleId),
          orientation: isHorizontal ? "horizontal" : "vertical",
          createdAt: new Date().toISOString(),
        };

        setPlacedAisles((prev) => ({
          ...prev,
          [newAisleId]: newAisle,
        }));

        setNextAisleId((prev) => prev + 1);
        cancelDrawing();
      }
    },
    [
      drawingMode,
      dragMode,
      startPoint,
      placedAisles,
      nextAisleId,
      formData.defaultBaysHigh,
      formData.zone,
      cancelDrawing,
      draggingAisle,
      dragPreview,
      gridSize,
    ]
  );

  // Generate color for aisle based on ID
  const generateAisleColor = useCallback((id) => {
    const colors = [
      "#4CAF50",
      "#2196F3",
      "#FF9800",
      "#9C27B0",
      "#F44336",
      "#00BCD4",
      "#8BC34A",
      "#FF5722",
    ];
    return colors[(id - 1) % colors.length];
  }, []);

  // Handle grid mouse move for preview
  const handleGridMouseMove = useCallback(
    (row, col) => {
      if (drawingMode && startPoint) {
        const isHorizontal = row === startPoint.row;
        const isVertical = col === startPoint.col;

        if (isHorizontal) {
          const width = Math.abs(col - startPoint.col) + 1;
          const leftCol = Math.min(startPoint.col, col);
          setPreviewArea({
            row: startPoint.row,
            col: leftCol,
            width,
            height: 1,
          });
        } else if (isVertical) {
          const height = Math.abs(row - startPoint.row) + 1;
          const topRow = Math.min(startPoint.row, row);
          setPreviewArea({
            row: topRow,
            col: startPoint.col,
            width: 1,
            height,
          });
        } else {
          setPreviewArea(null);
        }
      }

      if (dragMode && draggingAisle) {
        const newRow = row - dragOffset.row;
        const newCol = col - dragOffset.col;

        // Check if position is valid
        if (
          newRow >= 0 &&
          newCol >= 0 &&
          newRow + draggingAisle.height <= gridSize.rows &&
          newCol + draggingAisle.width <= gridSize.cols
        ) {
          setDragPreview({
            row: newRow,
            col: newCol,
            width: draggingAisle.width,
            height: draggingAisle.height,
          });
        } else {
          setDragPreview(null);
        }
      }
    },
    [drawingMode, startPoint, dragMode, draggingAisle, dragOffset, gridSize]
  );

  // Start editing aisle
  const startEditing = useCallback((aisle) => {
    setEditingAisle(aisle.id);
    setEditValues({
      baysHigh: aisle.baysHigh,
      sections: aisle.sections,
    });
  }, []);

  // Save edit changes
  const saveEdit = useCallback(() => {
    if (!editingAisle) return;

    setPlacedAisles((prev) => ({
      ...prev,
      [editingAisle]: {
        ...prev[editingAisle],
        baysHigh: editValues.baysHigh,
        sections: editValues.sections,
      },
    }));

    setEditingAisle(null);
    setEditValues({});
  }, [editingAisle, editValues]);

  // Cancel editing
  const cancelEdit = useCallback(() => {
    setEditingAisle(null);
    setEditValues({});
  }, []);

  // Duplicate aisle
  const duplicateAisle = useCallback(
    (aisle) => {
      const newAisleId = `aisle-${nextAisleId}`;
      const newAisle = {
        ...aisle,
        id: newAisleId,
        number: String(nextAisleId).padStart(2, "0"),
        gridRow: aisle.gridRow + (aisle.orientation === "vertical" ? 0 : 2),
        gridCol: aisle.gridCol + (aisle.orientation === "horizontal" ? 0 : 2),
        createdAt: new Date().toISOString(),
      };

      // Check if duplicate position is valid
      const wouldOverlap = Object.values(placedAisles).some((existingAisle) => {
        const aisleEndRow = existingAisle.gridRow + existingAisle.height;
        const aisleEndCol = existingAisle.gridCol + existingAisle.width;
        const newEndRow = newAisle.gridRow + newAisle.height;
        const newEndCol = newAisle.gridCol + newAisle.width;

        return !(
          newAisle.gridRow >= aisleEndRow ||
          newEndRow <= existingAisle.gridRow ||
          newAisle.gridCol >= aisleEndCol ||
          newEndCol <= existingAisle.gridCol
        );
      });

      if (
        wouldOverlap ||
        newAisle.gridRow + newAisle.height > gridSize.rows ||
        newAisle.gridCol + newAisle.width > gridSize.cols
      ) {
        alert("Cannot duplicate aisle - not enough space or would overlap");
        return;
      }

      setPlacedAisles((prev) => ({
        ...prev,
        [newAisleId]: newAisle,
      }));

      setNextAisleId((prev) => prev + 1);
    },
    [nextAisleId, placedAisles, gridSize]
  );

  // Generate bays for an aisle
  const generateBaysForAisle = useCallback((aisle) => {
    const bays = [];
    const { sections, baysHigh } = aisle;

    for (let section = 1; section <= sections; section++) {
      for (let bay = 1; bay <= baysHigh; bay++) {
        bays.push({
          section: String(section).padStart(2, "0"),
          bay: String(bay).padStart(2, "0"),
          locationCode: `${aisle.zone}${aisle.number}-${String(
            section
          ).padStart(2, "0")}-${String(bay).padStart(2, "0")}`,
        });
      }
    }

    return bays;
  }, []);

  // Delete aisle
  const deleteAisle = useCallback(
    (aisleId) => {
      if (window.confirm("Are you sure you want to delete this aisle?")) {
        setPlacedAisles((prev) => {
          const updated = { ...prev };
          delete updated[aisleId];
          return updated;
        });

        if (selectedAisle === aisleId) {
          setSelectedAisle(null);
        }
        if (editingAisle === aisleId) {
          setEditingAisle(null);
        }
      }
    },
    [selectedAisle, editingAisle]
  );

  // Save layout to JSON
  const saveLayout = useCallback(() => {
    const layout = {
      version: "1.0",
      created: new Date().toISOString(),
      gridSize,
      formData,
      aisles: placedAisles,
      nextAisleId,
      metadata: {
        totalAisles: Object.keys(placedAisles).length,
        totalBays: Object.values(placedAisles).reduce(
          (sum, aisle) => sum + aisle.sections * aisle.baysHigh,
          0
        ),
      },
    };

    const blob = new Blob([JSON.stringify(layout, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `warehouse_${formData.zone}_layout.json`;
    link.click();
  }, [gridSize, formData, placedAisles, nextAisleId]);

  // Load layout from JSON
  const loadLayout = useCallback(
    (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const layout = JSON.parse(e.target.result);

          if (layout.version && layout.aisles) {
            if (
              window.confirm("This will replace your current layout. Continue?")
            ) {
              setGridSize(layout.gridSize || { rows: 20, cols: 25 });
              setFormData(layout.formData || formData);
              setPlacedAisles(layout.aisles || {});
              setNextAisleId(layout.nextAisleId || 1);
              setSelectedAisle(null);
              setEditingAisle(null);
              cancelDrawing();
              cancelDragging();
            }
          } else {
            alert("Invalid layout file format");
          }
        } catch (error) {
          alert("Error loading layout file: " + error.message);
        }
      };
      reader.readAsText(file);

      // Reset file input
      event.target.value = "";
    },
    [formData, cancelDrawing, cancelDragging]
  );

  // Export to CSV
  const exportToCSV = useCallback(() => {
    const aisles = Object.values(placedAisles);
    if (aisles.length === 0) {
      alert("No aisles to export. Create some aisles first!");
      return;
    }

    let csv =
      "Zone,Aisle,Section,Bay,Location Code,Height(mm),Width(mm),Depth(mm),Grid Position,Aisle Dimensions,Orientation,Total Bays\n";

    aisles.forEach((aisle) => {
      const bays = generateBaysForAisle(aisle);
      const totalBays = bays.length;
      bays.forEach((bay, index) => {
        const gridPos = `R${aisle.gridRow}${
          aisle.height > 1 ? `-R${aisle.gridRow + aisle.height - 1}` : ""
        } C${aisle.gridCol}${
          aisle.width > 1 ? `-C${aisle.gridCol + aisle.width - 1}` : ""
        }`;
        const dimensions = `${aisle.width}×${aisle.height}`;
        csv += `${aisle.zone},${aisle.number},${bay.section},${bay.bay},${
          bay.locationCode
        },${formData.height},${formData.width},${
          formData.depth
        },${gridPos},${dimensions},${aisle.orientation},${
          index === 0 ? totalBays : ""
        }\n`;
      });
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `warehouse_${formData.zone}_locations.csv`;
    link.click();
  }, [placedAisles, generateBaysForAisle, formData]);

  // Clear all aisles
  const clearAll = useCallback(() => {
    if (window.confirm("Are you sure you want to clear all aisles?")) {
      setPlacedAisles({});
      setSelectedAisle(null);
      setNextAisleId(1);
      cancelDrawing();
      cancelEdit();
      cancelDragging();
    }
  }, [cancelDrawing, cancelEdit, cancelDragging]);

  // Update grid size - Fixed to properly handle aisles that would go out of bounds
  const updateGridSize = useCallback(
    (dimension, value) => {
      const newValue = Math.max(10, Math.min(50, parseInt(value) || 20));
      const newSize = {
        ...gridSize,
        [dimension]: newValue,
      };

      // Check if any aisles would be out of bounds with new size
      const aislesOutOfBounds = Object.values(placedAisles).filter((aisle) => {
        return (
          aisle.gridRow + aisle.height > newSize.rows ||
          aisle.gridCol + aisle.width > newSize.cols
        );
      });

      if (aislesOutOfBounds.length > 0 && newValue < gridSize[dimension]) {
        const confirm = window.confirm(
          `Reducing ${dimension} will remove ${aislesOutOfBounds.length} aisle(s) that extend beyond the new grid size. Continue?`
        );

        if (confirm) {
          // Remove out of bounds aisles
          const updatedAisles = { ...placedAisles };
          aislesOutOfBounds.forEach((aisle) => {
            delete updatedAisles[aisle.id];
          });
          setPlacedAisles(updatedAisles);
        } else {
          return;
        }
      }

      setGridSize(newSize);
    },
    [gridSize, placedAisles]
  );

  // Utility functions
  const isGridPositionOccupied = useCallback(
    (row, col) => {
      return Object.values(placedAisles).some((aisle) => {
        // Don't consider the dragging aisle as occupied in its original position
        if (draggingAisle && aisle.id === draggingAisle.id) return false;

        return (
          row >= aisle.gridRow &&
          row < aisle.gridRow + aisle.height &&
          col >= aisle.gridCol &&
          col < aisle.gridCol + aisle.width
        );
      });
    },
    [placedAisles, draggingAisle]
  );

  const getAisleAtPosition = useCallback(
    (row, col) => {
      return Object.values(placedAisles).find((aisle) => {
        return (
          row >= aisle.gridRow &&
          row < aisle.gridRow + aisle.height &&
          col >= aisle.gridCol &&
          col < aisle.gridCol + aisle.width
        );
      });
    },
    [placedAisles]
  );

  const isInPreviewArea = useCallback(
    (row, col) => {
      if (!previewArea) return false;
      return (
        row >= previewArea.row &&
        row < previewArea.row + previewArea.height &&
        col >= previewArea.col &&
        col < previewArea.col + previewArea.width
      );
    },
    [previewArea]
  );

  const isInDragPreview = useCallback(
    (row, col) => {
      if (!dragPreview) return false;
      return (
        row >= dragPreview.row &&
        row < dragPreview.row + dragPreview.height &&
        col >= dragPreview.col &&
        col < dragPreview.col + dragPreview.width
      );
    },
    [dragPreview]
  );

  const isStartPoint = useCallback(
    (row, col) => {
      return startPoint && startPoint.row === row && startPoint.col === col;
    },
    [startPoint]
  );

  // Calculate totals
  const totalAisles = Object.keys(placedAisles).length;
  const totalBays = Object.values(placedAisles).reduce(
    (sum, aisle) => sum + aisle.sections * aisle.baysHigh,
    0
  );
  const averageBaysPerAisle =
    totalAisles > 0 ? (totalBays / totalAisles).toFixed(1) : 0;

  return (
    <div className="warehouse-builder">
      <div className="header">
        <h1>Advanced Warehouse Layout Builder</h1>
        <div className="stats">
          <span>Aisles: {totalAisles}</span>
          <span>Total Bays: {totalBays}</span>
          <span>Avg Bays/Aisle: {averageBaysPerAisle}</span>
        </div>
      </div>

      <div className="main-container">
        {/* Enhanced Control Panel */}
        <div className="palette-panel">
          <h3>Layout Tools</h3>

          {/* Drawing Controls */}
          <div className="tool-section">
            <h4>Create & Move Aisles</h4>
            <p className="tool-instructions">
              {drawingMode
                ? `${
                    startPoint
                      ? "Click end point on same row or column"
                      : "Click start point anywhere on grid"
                  }`
                : dragMode
                ? `${
                    draggingAisle
                      ? "Click to drop aisle at new position"
                      : "Click any aisle to start dragging"
                  }`
                : "Choose a tool to create or move aisles"}
            </p>

            <div className="actions">
              {!drawingMode && !dragMode ? (
                <>
                  <button onClick={startDrawing} className="btn btn-primary">
                    Start Drawing Aisle
                  </button>
                  <button onClick={startDragging} className="btn btn-info">
                    <Move size={16} /> Start Dragging Mode
                  </button>
                </>
              ) : drawingMode ? (
                <button onClick={cancelDrawing} className="btn btn-secondary">
                  Cancel Drawing
                </button>
              ) : (
                <button onClick={cancelDragging} className="btn btn-secondary">
                  Cancel Dragging
                </button>
              )}
            </div>
          </div>

          {/* Grid Configuration */}
          <div className="tool-section">
            <h4>Grid Settings</h4>
            <div className="grid-controls">
              <div className="form-group">
                <label>Rows:</label>
                <input
                  type="number"
                  value={gridSize.rows}
                  onChange={(e) => updateGridSize("rows", e.target.value)}
                  min="10"
                  max="50"
                  disabled={drawingMode || dragMode}
                />
              </div>
              <div className="form-group">
                <label>Columns:</label>
                <input
                  type="number"
                  value={gridSize.cols}
                  onChange={(e) => updateGridSize("cols", e.target.value)}
                  min="10"
                  max="50"
                  disabled={drawingMode || dragMode}
                />
              </div>
            </div>
          </div>

          {/* View Options - Fixed to only show working options */}
          <div className="tool-section">
            <h4>View Options</h4>
            <div className="view-controls">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                />
                <Grid3X3 size={16} />
                Show Grid
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={showLabels}
                  onChange={(e) => setShowLabels(e.target.checked)}
                />
                <Eye size={16} />
                Show Labels
              </label>
            </div>
          </div>

          {/* Aisle Configuration */}
          <div className="tool-section">
            <h4>Default Settings</h4>

            <div className="form-group">
              <label>Zone:</label>
              <input
                type="text"
                value={formData.zone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, zone: e.target.value }))
                }
                placeholder="A"
                disabled={drawingMode || dragMode}
              />
            </div>

            <div className="form-group">
              <label>Default Bays High:</label>
              <div className="number-input">
                <button
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      defaultBaysHigh: Math.max(1, prev.defaultBaysHigh - 1),
                    }))
                  }
                  disabled={drawingMode || dragMode}
                  className="btn btn-sm"
                >
                  <Minus size={14} />
                </button>
                <span className="number-display">
                  {formData.defaultBaysHigh}
                </span>
                <button
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      defaultBaysHigh: prev.defaultBaysHigh + 1,
                    }))
                  }
                  disabled={drawingMode || dragMode}
                  className="btn btn-sm"
                >
                  <Plus size={14} />
                </button>
              </div>
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
                      height: parseInt(e.target.value) || 1500,
                    }))
                  }
                  disabled={drawingMode || dragMode}
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
                      width: parseInt(e.target.value) || 1000,
                    }))
                  }
                  disabled={drawingMode || dragMode}
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
                      depth: parseInt(e.target.value) || 1200,
                    }))
                  }
                  disabled={drawingMode || dragMode}
                />
              </div>
            </div>
          </div>

          {/* File Operations */}
          <div className="tool-section">
            <h4>File Operations</h4>
            <div className="file-actions">
              <button onClick={saveLayout} className="btn btn-info">
                <Save size={16} /> Save Layout
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-info"
              >
                <Upload size={16} /> Load Layout
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={loadLayout}
                style={{ display: "none" }}
              />
            </div>
          </div>

          {/* Export Actions */}
          <div className="tool-section">
            <h4>Export</h4>
            <div className="export-actions">
              <button onClick={exportToCSV} className="btn btn-success">
                <Download size={16} /> Export CSV
              </button>
              <button onClick={clearAll} className="btn btn-danger">
                <Trash2 size={16} /> Clear All
              </button>
            </div>
          </div>

          {/* Placed Aisles List */}
          <div className="placed-aisles">
            <h3>Placed Aisles ({totalAisles})</h3>
            <div className="aisles-list">
              {Object.values(placedAisles)
                .sort((a, b) => parseInt(a.number) - parseInt(b.number))
                .map((aisle) => (
                  <div
                    key={aisle.id}
                    className={`placed-aisle-item ${
                      selectedAisle === aisle.id ? "selected" : ""
                    } ${draggingAisle?.id === aisle.id ? "dragging" : ""}`}
                  >
                    <div
                      className="aisle-info"
                      onClick={() =>
                        setSelectedAisle(
                          selectedAisle === aisle.id ? null : aisle.id
                        )
                      }
                    >
                      <span className="aisle-name">
                        {formData.zone}
                        {aisle.number}
                      </span>
                      <span className="aisle-details">
                        {aisle.orientation === "horizontal"
                          ? `${aisle.width} sections`
                          : `${aisle.height} sections`}{" "}
                        •{" "}
                        {editingAisle === aisle.id
                          ? editValues.baysHigh
                          : aisle.baysHigh}{" "}
                        bays high
                      </span>
                      <span className="grid-position">
                        {aisle.orientation === "horizontal"
                          ? `R${aisle.gridRow} C${aisle.gridCol}-${
                              aisle.gridCol + aisle.width - 1
                            }`
                          : `R${aisle.gridRow}-${
                              aisle.gridRow + aisle.height - 1
                            } C${aisle.gridCol}`}
                      </span>
                      {showBayDetails && (
                        <span className="bay-count">
                          Total Bays: {aisle.sections * aisle.baysHigh}
                        </span>
                      )}
                    </div>

                    {editingAisle === aisle.id ? (
                      <div className="edit-controls">
                        <div className="edit-field">
                          <label>Bays High:</label>
                          <div className="number-input">
                            <button
                              onClick={() =>
                                setEditValues((prev) => ({
                                  ...prev,
                                  baysHigh: Math.max(1, prev.baysHigh - 1),
                                }))
                              }
                              className="btn btn-sm"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="number-display">
                              {editValues.baysHigh}
                            </span>
                            <button
                              onClick={() =>
                                setEditValues((prev) => ({
                                  ...prev,
                                  baysHigh: prev.baysHigh + 1,
                                }))
                              }
                              className="btn btn-sm"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                        <div className="edit-buttons">
                          <button
                            onClick={saveEdit}
                            className="btn btn-sm btn-success"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="btn btn-sm btn-secondary"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="aisle-actions">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(aisle);
                          }}
                          className="btn btn-sm btn-primary"
                          title="Edit aisle"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateAisle(aisle);
                          }}
                          className="btn btn-sm btn-info"
                          title="Duplicate aisle"
                        >
                          <Copy size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteAisle(aisle.id);
                          }}
                          className="btn btn-sm btn-danger"
                          title="Delete aisle"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Enhanced Warehouse Grid */}
        <div className="warehouse-grid">
          <h3>Warehouse Layout Grid</h3>
          <p className="grid-instructions">
            {drawingMode
              ? `Drawing Mode - ${
                  startPoint
                    ? "Select end point on same row or column"
                    : "Select start point anywhere"
                }`
              : dragMode
              ? `Drag Mode - ${
                  draggingAisle
                    ? "Click to drop aisle"
                    : "Click any aisle to start dragging"
                }`
              : `Grid: ${gridSize.rows} × ${gridSize.cols} - Select a tool above to begin`}
          </p>

          <div
            className={`grid-container ${!showGrid ? "hide-grid" : ""}`}
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${gridSize.cols}, 1fr)`,
              gridTemplateRows: `repeat(${gridSize.rows}, 1fr)`,
              gap: "1px",
              backgroundColor: "#e0e0e0",
              padding: "10px",
              overflow: "auto",
            }}
          >
            {Array.from({ length: gridSize.rows }, (_, row) =>
              Array.from({ length: gridSize.cols }, (_, col) => {
                const isOccupied = isGridPositionOccupied(row, col);
                const aisle = getAisleAtPosition(row, col);
                const inPreview = isInPreviewArea(row, col);
                const inDragPreview = isInDragPreview(row, col);
                const isStart = isStartPoint(row, col);
                const showInvalidDirection =
                  drawingMode &&
                  startPoint &&
                  row !== startPoint.row &&
                  col !== startPoint.col;
                const isDraggingThis =
                  draggingAisle && aisle?.id === draggingAisle.id;

                return (
                  <div
                    key={`${row}-${col}`}
                    className={`grid-slot ${
                      isOccupied && !isDraggingThis ? "occupied" : ""
                    } 
                               ${drawingMode ? "drawing-mode" : ""} 
                               ${dragMode ? "drag-mode" : ""}
                               ${inPreview ? "preview-area" : ""}
                               ${inDragPreview ? "drag-preview" : ""}
                               ${isStart ? "start-point" : ""}
                               ${
                                 showInvalidDirection ? "invalid-direction" : ""
                               }
                               ${isDraggingThis ? "being-dragged" : ""}
                               ${
                                 selectedAisle && aisle?.id === selectedAisle
                                   ? "selected-aisle"
                                   : ""
                               }`}
                    onClick={() => handleGridClick(row, col)}
                    onMouseMove={() => handleGridMouseMove(row, col)}
                    style={{
                      backgroundColor: isDraggingThis
                        ? "transparent"
                        : inDragPreview
                        ? dragPreview &&
                          isValidDropPosition(dragPreview.row, dragPreview.col)
                          ? "#4CAF5080"
                          : "#F4433680"
                        : aisle && !isDraggingThis
                        ? aisle.color + "40"
                        : "#f5f5f5",
                      cursor: drawingMode
                        ? "crosshair"
                        : dragMode
                        ? "grab"
                        : "default",
                      border: "1px solid #ddd",
                      minHeight: "20px",
                      minWidth: "20px",
                      position: "relative",
                    }}
                  >
                    {/* Only render aisle content once at the top-left corner */}
                    {aisle &&
                      !isDraggingThis &&
                      ((aisle.orientation === "horizontal" &&
                        col === aisle.gridCol) ||
                        (aisle.orientation === "vertical" &&
                          row === aisle.gridRow)) && (
                        <div
                          className="placed-aisle"
                          style={{
                            backgroundColor: aisle.color + "80",
                            borderColor: aisle.color,
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width:
                              aisle.orientation === "horizontal"
                                ? `${aisle.width * 100}%`
                                : "100%",
                            height:
                              aisle.orientation === "vertical"
                                ? `${aisle.height * 100}%`
                                : "100%",
                            border: `2px solid ${aisle.color}`,
                            borderRadius: "4px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "10px",
                            fontWeight: "bold",
                            zIndex: 2,
                            cursor: dragMode ? "grab" : "pointer",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!dragMode) {
                              setSelectedAisle(
                                aisle.id === selectedAisle ? null : aisle.id
                              );
                            }
                          }}
                        >
                          {showLabels && (
                            <>
                              <div
                                className="aisle-label"
                                style={{
                                  color: "#000",
                                  textShadow: "1px 1px 1px #fff",
                                }}
                              >
                                {formData.zone}
                                {aisle.number}
                              </div>
                              <div
                                className="aisle-info-small"
                                style={{
                                  color: "#000",
                                  textShadow: "1px 1px 1px #fff",
                                  fontSize: "8px",
                                }}
                              >
                                {aisle.orientation === "horizontal"
                                  ? `${aisle.width}w`
                                  : `${aisle.height}h`}{" "}
                                • {aisle.baysHigh}b
                              </div>
                            </>
                          )}
                        </div>
                      )}

                    {/* Show drag preview */}
                    {inDragPreview &&
                      dragPreview &&
                      ((dragPreview.width > 1 && col === dragPreview.col) ||
                        (dragPreview.height > 1 && row === dragPreview.row) ||
                        (dragPreview.width === 1 &&
                          dragPreview.height === 1)) && (
                        <div
                          className="drag-preview-aisle"
                          style={{
                            backgroundColor: isValidDropPosition(
                              dragPreview.row,
                              dragPreview.col
                            )
                              ? "#4CAF5060"
                              : "#F4433660",
                            border: `2px dashed ${
                              isValidDropPosition(
                                dragPreview.row,
                                dragPreview.col
                              )
                                ? "#4CAF50"
                                : "#F44336"
                            }`,
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width:
                              dragPreview.width > 1
                                ? `${dragPreview.width * 100}%`
                                : "100%",
                            height:
                              dragPreview.height > 1
                                ? `${dragPreview.height * 100}%`
                                : "100%",
                            borderRadius: "4px",
                            zIndex: 3,
                            pointerEvents: "none",
                          }}
                        />
                      )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Helper function to check if drop position is valid
  function isValidDropPosition(row, col) {
    if (!draggingAisle) return false;

    // Check bounds
    if (
      row < 0 ||
      col < 0 ||
      row + draggingAisle.height > gridSize.rows ||
      col + draggingAisle.width > gridSize.cols
    ) {
      return false;
    }

    // Check overlap with other aisles
    const wouldOverlap = Object.values(placedAisles).some((aisle) => {
      if (aisle.id === draggingAisle.id) return false;

      const aisleEndRow = aisle.gridRow + aisle.height;
      const aisleEndCol = aisle.gridCol + aisle.width;
      const newEndRow = row + draggingAisle.height;
      const newEndCol = col + draggingAisle.width;

      return !(
        row >= aisleEndRow ||
        newEndRow <= aisle.gridRow ||
        col >= aisleEndCol ||
        newEndCol <= aisle.gridCol
      );
    });

    return !wouldOverlap;
  }
};

export default WarehouseBuilder;
