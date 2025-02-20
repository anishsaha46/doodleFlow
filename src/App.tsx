import React, { useEffect, useRef, useState } from 'react';
import { Square, Circle, Minus, Edit3, Type, MousePointer, Palette, Users, ArrowRight, Download, Undo2 } from 'lucide-react';
import { io } from 'socket.io-client';

interface Element {
  type: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  points?: [number, number][];
  text?: string;
  selected?: boolean;
  rotation?: number;
  scale?: { x: number; y: number };
}

interface CursorPosition {
  userId: string;
  x: number;
  y: number;
}

// Initialize socket connection
const socket = io('http://localhost:3001');

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [currentTool, setCurrentTool] = useState('select');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [isDrawing, setIsDrawing] = useState(false);
  const [elements, setElements] = useState<Element[]>([]);
  const [currentElement, setCurrentElement] = useState<Element | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [connectedUsers, setConnectedUsers] = useState(0);
  const [cursors, setCursors] = useState<{ [key: string]: CursorPosition }>({});
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [initialAngle, setInitialAngle] = useState(0);

  // Load saved drawings when the component mounts
  useEffect(() => {
    const savedDrawings = localStorage.getItem('drawings');
    if (savedDrawings) {
      try {
        const parsedDrawings = JSON.parse(savedDrawings);
        setElements(parsedDrawings);
      } catch (error) {
        console.error('Error loading saved drawings:', error);
      }
    }
  }, []);

  // Auto-save drawings whenever they change
  useEffect(() => {
    if (elements.length > 0) {
      localStorage.setItem('drawings', JSON.stringify(elements));
    }
  }, [elements]);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      setCtx(context);

      const resizeCanvas = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        redrawCanvas();
      };

      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);

      socket.on('draw', (newElement: Element) => {
        setElements(prev => [...prev, newElement]);
      });

      socket.on('userCount', (count: number) => {
        setConnectedUsers(count);
      });

      socket.on('cursorMove', (data: CursorPosition) => {
        setCursors(prev => ({
          ...prev,
          [data.userId]: { x: data.x, y: data.y, userId: data.userId }
        }));
      });

      socket.on('userDisconnected', (userId: string) => {
        setCursors(prev => {
          const newCursors = { ...prev };
          delete newCursors[userId];
          return newCursors;
        });
      });

      return () => {
        window.removeEventListener('resize', resizeCanvas);
        socket.off('draw');
        socket.off('userCount');
        socket.off('cursorMove');
        socket.off('userDisconnected');
      };
    }
  }, []);

  const redrawCanvas = () => {
    if (!ctx || !canvasRef.current) return;

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    elements.forEach(element => {
      drawElement(element);
      if (element.selected) {
        drawResizeHandles(element);
      }
    });

    if (currentElement) {
      drawElement(currentElement);
    }
  };

  const drawElement = (element: Element) => {
    if (!ctx) return;

    ctx.save();
    ctx.strokeStyle = element.color;
    ctx.fillStyle = element.color;

    if (element.rotation) {
      const centerX = (element.startX + element.endX) / 2;
      const centerY = (element.startY + element.endY) / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate(element.rotation);
      ctx.translate(-centerX, -centerY);
    }

    switch (element.type) {
      case 'rectangle':
        ctx.strokeRect(
          element.startX,
          element.startY,
          element.endX - element.startX,
          element.endY - element.startY
        );
        break;

      case 'ellipse':
        ctx.beginPath();
        ctx.ellipse(
          element.startX,
          element.startY,
          Math.abs(element.endX - element.startX),
          Math.abs(element.endY - element.startY),
          0, 0, 2 * Math.PI
        );
        ctx.stroke();
        break;

      case 'line':
        ctx.beginPath();
        ctx.moveTo(element.startX, element.startY);
        ctx.lineTo(element.endX, element.endY);
        ctx.stroke();
        break;

      case 'arrow':
        drawArrow(
          ctx,
          element.startX,
          element.startY,
          element.endX,
          element.endY,
          element.color
        );
        break;

      case 'freehand':
        if (element.points) {
          ctx.beginPath();
          ctx.moveTo(element.points[0][0], element.points[0][1]);
          element.points.forEach(point => {
            ctx.lineTo(point[0], point[1]);
          });
          ctx.stroke();
        }
        break;

      case 'text':
        if (element.text) {
          ctx.font = '16px Inter, sans-serif';
          ctx.fillText(element.text, element.startX, element.startY);
        }
        break;
    }

    ctx.restore();
  };

  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    color: string
  ) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;

    // Draw the line
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Calculate the arrow head
    const angle = Math.atan2(endY - startY, endX - startX);
    const arrowLength = 20;
    const arrowWidth = 8;

    // Draw the arrow head
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - arrowLength * Math.cos(angle - Math.PI / arrowWidth),
      endY - arrowLength * Math.sin(angle - Math.PI / arrowWidth)
    );
    ctx.lineTo(
      endX - arrowLength * Math.cos(angle + Math.PI / arrowWidth),
      endY - arrowLength * Math.sin(angle + Math.PI / arrowWidth)
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const drawResizeHandles = (element: Element) => {
    if (!ctx) return;

    const padding = 5;
    const handleSize = 8;
    const minX = Math.min(element.startX, element.endX) - padding;
    const maxX = Math.max(element.startX, element.endX) + padding;
    const minY = Math.min(element.startY, element.endY) - padding;
    const maxY = Math.max(element.startY, element.endY) + padding;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    ctx.fillStyle = '#4299e1';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;

    const handles = [
      { x: minX, y: minY, cursor: 'nw-resize', id: 'tl' },
      { x: maxX, y: minY, cursor: 'ne-resize', id: 'tr' },
      { x: minX, y: maxY, cursor: 'sw-resize', id: 'bl' },
      { x: maxX, y: maxY, cursor: 'se-resize', id: 'br' },
      { x: centerX, y: minY, cursor: 'n-resize', id: 'tm' },
      { x: centerX, y: maxY, cursor: 's-resize', id: 'bm' },
      { x: minX, y: centerY, cursor: 'w-resize', id: 'ml' },
      { x: maxX, y: centerY, cursor: 'e-resize', id: 'mr' },
    ];

    handles.forEach(handle => {
      ctx.beginPath();
      ctx.arc(handle.x, handle.y, handleSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // Draw rotation handle
    const rotationHandleY = minY - 20;
    ctx.beginPath();
    ctx.moveTo(centerX, minY);
    ctx.lineTo(centerX, rotationHandleY);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, rotationHandleY, handleSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  };

  const getResizeHandle = (x: number, y: number, element: Element): string | null => {
    const padding = 5;
    const handleSize = 8;
    const minX = Math.min(element.startX, element.endX) - padding;
    const maxX = Math.max(element.startX, element.endX) + padding;
    const minY = Math.min(element.startY, element.endY) - padding;
    const maxY = Math.max(element.startY, element.endY) + padding;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const handles = [
      { x: minX, y: minY, id: 'tl' },
      { x: maxX, y: minY, id: 'tr' },
      { x: minX, y: maxY, id: 'bl' },
      { x: maxX, y: maxY, id: 'br' },
      { x: centerX, y: minY, id: 'tm' },
      { x: centerX, y: maxY, id: 'bm' },
      { x: minX, y: centerY, id: 'ml' },
      { x: maxX, y: centerY, id: 'mr' },
      { x: centerX, y: minY - 20, id: 'rotate' },
    ];

    for (const handle of handles) {
      const dx = x - handle.x;
      const dy = y - handle.y;
      if (dx * dx + dy * dy <= handleSize * handleSize) {
        return handle.id;
      }
    }
    return null;
  };

  const resizeElement = (element: Element, handle: string, dx: number, dy: number): Element => {
    const newElement = { ...element };
    
    switch (handle) {
      case 'tl':
        newElement.startX += dx;
        newElement.startY += dy;
        break;
      case 'tr':
        newElement.endX += dx;
        newElement.startY += dy;
        break;
      case 'bl':
        newElement.startX += dx;
        newElement.endY += dy;
        break;
      case 'br':
        newElement.endX += dx;
        newElement.endY += dy;
        break;
      case 'tm':
        newElement.startY += dy;
        break;
      case 'bm':
        newElement.endY += dy;
        break;
      case 'ml':
        newElement.startX += dx;
        break;
      case 'mr':
        newElement.endX += dx;
        break;
    }

    return newElement;
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const startX = clientX - rect.left;
    const startY = clientY - rect.top;

    if (currentTool === 'select' && selectedElement) {
      const handle = getResizeHandle(startX, startY, selectedElement);
      if (handle) {
        if (handle === 'rotate') {
          setIsRotating(true);
          const centerX = (selectedElement.startX + selectedElement.endX) / 2;
          const centerY = (selectedElement.startY + selectedElement.endY) / 2;
          setInitialAngle(Math.atan2(startY - centerY, startX - centerX));
        } else {
          setResizeHandle(handle);
        }
        return;
      }
    }

    setIsDrawing(true);

    const newElement: Element = {
      type: currentTool,
      startX,
      startY,
      endX: startX,
      endY: startY,
      color: currentColor,
      points: currentTool === 'freehand' ? [[startX, startY]] : undefined,
    };

    setCurrentElement(newElement);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !ctx || !canvasRef.current || !currentElement) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    let updatedElement = { ...currentElement };

    if (resizeHandle && selectedElement) {
      updatedElement = resizeElement(selectedElement, resizeHandle, x - currentElement.endX, y - currentElement.endY);
    } else if (isRotating && selectedElement) {
      const centerX = (selectedElement.startX + selectedElement.endX) / 2;
      const centerY = (selectedElement.startY + selectedElement.endY) / 2;
      const angle = Math.atan2(y - centerY, x - centerX) - initialAngle;
      updatedElement = { ...selectedElement, rotation: angle };
    } else {
      if (currentTool === 'freehand' && updatedElement.points) {
        updatedElement.points.push([x, y]);
      } else {
        updatedElement.endX = x;
        updatedElement.endY = y;
      }
    }

    setCurrentElement(updatedElement);
    redrawCanvas();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;

    if (currentElement) {
      if (resizeHandle || isRotating) {
        setElements(prev => 
          prev.map(el => el.selected ? currentElement : el)
        );
      } else if (currentTool !== 'select') {
        setElements(prev => [...prev, currentElement]);
        socket.emit('draw', currentElement);
      }
    }

    setIsDrawing(false);
    setCurrentElement(null);
    setResizeHandle(null);
    setIsRotating(false);
    redrawCanvas();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      socket.emit('cursorMove', { x, y });
    }
    draw(e);
  };

  const handleClearCanvas = () => {
    if (window.confirm('Are you sure you want to clear all drawings?')) {
      setElements([]);
      localStorage.removeItem('drawings');
      redrawCanvas();
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const link = document.createElement('a');
      link.download = 'drawing.png';
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const handleUndo = () => {
    setElements((prevElements) => prevElements.slice(0, -1));
  };

  const handleClickCanvas = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if the click is on an element
    const clickedElement = elements.find(element => {
      return (
        x >= element.startX && x <= element.endX &&
        y >= element.startY && y <= element.endY
      );
    });

    if (clickedElement) {
      setSelectedElement(clickedElement);
    } else {
      setSelectedElement(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-2 flex items-center gap-2">
        <div className="flex items-center gap-2 px-2 border-r border-gray-200">
          <Users className="w-5 h-5 text-gray-500" />
          <span className="text-sm text-gray-600">{connectedUsers} online</span>
        </div>
        <button
          onClick={() => setCurrentTool('select')}
          className={`p-2 rounded-md hover:bg-gray-100 transition-colors ${currentTool === 'select' ? 'bg-gray-100' : ''}`}
          title="Select"
        >
          <MousePointer className="w-5 h-5" />
        </button>
        <button
          onClick={() => setCurrentTool('rectangle')}
          className={`p-2 rounded-md hover:bg-gray-100 transition-colors ${currentTool === 'rectangle' ? 'bg-gray-100' : ''}`}
          title="Rectangle"
        >
          <Square className="w-5 h-5" />
        </button>
        <button
          onClick={() => setCurrentTool('ellipse')}
          className={`p-2 rounded-md hover:bg-gray-100 transition-colors ${currentTool === 'ellipse' ? 'bg-gray-100' : ''}`}
          title="Ellipse"
        >
          <Circle className="w-5 h-5" />
        </button>
        <button
          onClick={() => setCurrentTool('line')}
          className={`p-2 rounded-md hover:bg-gray-100 transition-colors ${currentTool === 'line' ? 'bg-gray-100' : ''}`}
          title="Line"
        >
          <Minus className="w-5 h-5" />
        </button>
        <button
          onClick={() => setCurrentTool('arrow')}
          className={`p-2 rounded-md hover:bg-gray-100 transition-colors ${currentTool === 'arrow' ? 'bg-gray-100' : ''}`}
          title="Arrow"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <button
          onClick={() => setCurrentTool('freehand')}
          className={`p-2 rounded-md hover:bg-gray-100 transition-colors ${currentTool === 'freehand' ? 'bg-gray-100' : ''}`}
          title="Freehand"
        >
          <Edit3 className="w-5 h-5" />
        </button>
        <button
          onClick={() => setCurrentTool('text')}
          className={`p-2 rounded-md hover:bg-gray-100 transition-colors ${currentTool === 'text' ? 'bg-gray-100' : ''}`}
          title="Text"
        >
          <Type className="w-5 h-5" />
        </button>
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
            title="Color"
          >
            <Palette className="w-5 h-5" style={{ color: currentColor }} />
          </button>
          <input
            type="color"
            value={currentColor}
            onChange={(e) => setCurrentColor(e.target.value)}
            className={`absolute top-full left-0 mt-2 w-8 h-8 cursor-pointer ${showColorPicker ? 'block' : 'hidden'}`}
          />
        </div>
        <div className="w-px h-6 bg-gray-200 mx-1" />
        <button
          onClick={handleClearCanvas}
          className="p-2 rounded-md hover:bg-gray-100 transition-colors text-red-500"
          title="Clear Canvas"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
        </button>
        <button
          onClick={handleUndo}
          className="p-2 rounded-md hover:bg-gray-100 transition-colors"
          title="Undo"
        >
          <Undo2 className="w-5 h-5" />
        </button>
        <button
          onClick={handleDownload}
          className="p-2 rounded-md hover:bg-gray-100 transition-colors"
          title="Download"
        >
          <Download className="w-5 h-5" />
        </button>
      </div>

      {Object.values(cursors).map((cursor) => (
        <div
          key={cursor.userId}
          className="fixed w-4 h-4 pointer-events-none"
          style={{
            left: cursor.x,
            top: cursor.y,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className="w-3 h-3 bg-blue-500 rounded-full" />
          <div className="text-xs text-blue-500 whitespace-nowrap">
            User {cursor.userId.slice(0, 4)}
          </div>
        </div>
      ))}

      <canvas
        ref={canvasRef}
        className="touch-none"
        onMouseDown={(e) => {
          startDrawing(e);
          handleClickCanvas(e);
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
        onTouchStart={(e) => {
          e.preventDefault();
          startDrawing(e);
        }}
        onTouchMove={(e) => {
          e.preventDefault();
          draw(e);
        }}
        onTouchEnd={stopDrawing}
      />
    </div>
  );
}

export default App;