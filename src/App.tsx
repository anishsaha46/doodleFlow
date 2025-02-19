import React , {useEffect,useState,useRef} from 'react';
import { Square, Circle, Minus, Edit3, Type, Undo2, Download, MousePointer, Palette,Users,Save,Upload,ArrowRight } from 'lucide-react';
import { io } from 'socket.io-client';


interface Element {
  // type of shape
  type:string;
  // starting x coordinate
  startX:number;
  // starting y coordinate
  startY:number;
  // ending X coordiante
  endX:number;
  // ending Y coordiante
  endY:number;
  // element color
  color:string;
  // array of points for freehand drawing
  points?:[number,number][];
  // text content for text element
  text?:string;
  // selection state for the element
  selected?:boolean;
  // position of the element
  rotation?:number;
  // scale factor for the element
  scale?: {x:number; y:number};
}

interface CursorPosition {
  userId:string;
  x: number;
  y: number;
}

const socket = io('http://localhost:3001');
function App() {
  // refrences the canvas Element to draw on
  const canvasRef=useRef<HTMLCanvasElement>(null);
  // stores the canvas context for rendering
  const [ctx,setCtx]=useState<CanvasRenderingContext2D | null>(null);
  // tracks the currently selected tool (eg rectangle , line ,text,etc);
  const [currentTool,setCurrentTool]=useState('select');
  // stores the currently selected color
  const [currentColor,setCurrentColor]=useState('#000000');
  // indicates whether the user is actively drawing on the canvas
  const [isDrawing,setIsDrawing]=useState(false);
  // Maintains the list of elements drawn on the canvas
  const [elements,setElements]=useState<Element[]>([]);
  // maintains the currently active element being drawn
  const [currentElement,setCurrentElement]=useState<Element | null>(null);
  // toogles the visiblity of the color picker
  const [showColorPicker,setShowColorPicker]=useState(false);
  // keeps track of the cuurently selected elements
  const [selectedElement,setSelectedElement]=useState<Element | null>(null);
  // keeps track of the previous cursor positions
  const [cursors,setCursors] = useState<{[key:string]:CursorPosition}>({});
  const [resizeHandle,setResizeHandle] = useState<string | null>(null);
  
  const [isRotating,setIsRotating] = useState(false);
  const [initialAngle,setInitialAngle] = useState(0);

// Load saved Drawings when the components mount
useEffect(()=>{
  const savedDrawings = localStorage.getItem('drawings');
  if(savedDrawings){
    try {
      const parsedDrawings = JSON.parse(savedDrawings);
      setElements(parsedDrawings);
    } catch(error){
      console.error('Error parsing saved drawings:', error);
    }
  }
},[]);

// Auto save Drawings whenever they change
useEffect(()=>{
  if(elements.length > 0){
    localStorage.setItem('drawings', JSON.stringify(elements));
  }
},[elements]);


  // initialize canvas and handle window resizing
  useEffect(()=>{
    if(canvasRef.current){
      // access to canvas DOM element
      const canvas=canvasRef.current;
      // initializing 2d drawing context of the canvas
      const context=canvas.getContext('2d');
      // stores the 2D context in the components state making it accessible for drawing operations elsewhere in the component
      setCtx(context);

      const resizeCanvas = () =>{
        // set the dimensions of the canvas to full height and width of brower window
        canvas.width=window.innerWidth;
        canvas.height=window.innerHeight;
        // redraws the existing elements on the canvas after resisizing to avoid clearing any previously drawn content
        redrawCanvas();
      };
      resizeCanvas();
      // this ensures every time the browser window is resized the resizeCanvas function is called to adjust the canvas dimenstions and redraw its content 
      window.addEventListener('resize',resizeCanvas);

      socket.on('draw',(newElement:Element) = > {
        setElements(prev => [...prev,newElement]);
      });
      
      // ensures no memory leaks
      return () => window.removeEventListener('resize',resizeCanvas);
    }
  },[]);


  // This function, isPointInElement, determines whether a given point (with coordinates x and y) falls within or near a specified element (such as a rectangle, ellipse, or line). It is typically used for selecting or interacting with drawn elements on a canvas.

  const isPointInElement = (x: number, y: number, element: Element) => {
    const padding = 5; // Padding for easier selection
    
    switch(element.type) {

//Logic: Checks if the point (x, y) lies within the bounds of the rectangle, including the additional padding.
// Math.min and Math.max: Handle rectangles drawn in any direction

      case 'rectangle':
        const minX = Math.min(element.startX, element.endX) - padding;
        const maxX = Math.max(element.startX, element.endX) + padding;
        const minY = Math.min(element.startY, element.endY) - padding;
        const maxY = Math.max(element.startY, element.endY) + padding;
        return x >= minX && x <= maxX && y >= minY && y <= maxY;
    
        // uses standard elipse equations and ddetermines whether a point inside or near the ellipse
        
      case 'ellipse':
        const centerX = element.startX;
        const centerY = element.startY;
        const radiusX = Math.abs(element.endX - element.startX) + padding;
        const radiusY = Math.abs(element.endY - element.startY) + padding;
        return Math.pow((x - centerX) / radiusX, 2) + Math.pow((y - centerY) / radiusY, 2) <= 1;
      
        // uses the formula for the shortes distance from a point to a line and LinesWidth add tolerance for selecting a line ,accounting for the fact that lines have no inherent thickeness

      case 'line':
        const lineWidth = 10; // Line selection tolerance
        const dx = element.endX - element.startX;
        const dy = element.endY - element.startY;
        const length = Math.sqrt(dx * dx + dy * dy);
        const distance = Math.abs((dy * x - dx * y + element.endX * element.startY - element.endY * element.startX) / length);
        return distance <= lineWidth;
      
      default:
        return false;
    }
  };

  // The redrawCanvas function is responsible for redrawing the entire canvas by iterating through all the elements and rendering them based on their type, styles, and properties

  const redrawCanvas = () => {
    // ensures the drawing context and the canvas reference are available
    if (!ctx || !canvasRef.current) return;

// clears the entire canvas by removing any existing drawings ensuring the new render starts with a blank slate
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

// iterate through all the elment to redraw each one
    elements.forEach(element => {
      // sets the stroke and fill colors for the current element 
      ctx.strokeStyle = element.color;
      ctx.fillStyle = element.color;

      // Draw selection highlight
      if (element.selected) {
        ctx.save();
        ctx.strokeStyle = '#4299e1'; // Blue highlight
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
      }
// rendering elements by thier type
      switch(element.type) {
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

        case 'freehand':
          if (element.points) {
            ctx.beginPath();
            ctx.moveTo(element.points[0][0], element.points[0][1]);
            element.points.forEach(point => {
              ctx.lineTo(point[0], point[1]);
            });
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
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

      if (element.selected) {
        ctx.restore();
      }
    });
  };

  // The startDrawing function initializes the drawing process or handles selection/text input based on the current tool

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {

    // retrieves the canvas dom using canvasRef and if the canvas is not available the function  exits early
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Converts these coordinates to canvas space using getBoundingClientRect() to account for offsets like margins, borders, or scrolling.
    const rect = canvas.getBoundingClientRect();

    // Determines the mouse/touch event's coordinates (clientX, clientY).
    // Uses the touches property if the event is a touch event, otherwise uses clientX and clientY

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const startX = clientX - rect.left;
    const startY = clientY - rect.top;

    if (currentTool === 'select') {
      // Deselect all elements first
      setElements(prev => prev.map(el => ({ ...el, selected: false })));
      
      // Find clicked element
      const clickedElement = [...elements].reverse().find(el => 
        isPointInElement(startX, startY, el)
      );

// If a clicked element is found:
// Updates the selectedElement state.
// Marks the element as selected by setting its selected property to true.
// If no element is found, deselects all by setting selectedElement to null.
      if (clickedElement) {
        setSelectedElement(clickedElement);
        setElements(prev => prev.map(el => 
          el === clickedElement ? { ...el, selected: true } : el
        ));
      } else {
        setSelectedElement(null);
      }
      return;
    }

    if (currentTool === 'text') {
      const text = prompt('Enter text:');
      if (text) {
        const textElement = {
          type: 'text',
          startX,
          startY,
          endX: startX,
          endY: startY,
          text,
          color: currentColor
        };
        setElements(prev => [...prev, textElement]);
        redrawCanvas();
      }
      return;
    }

    setIsDrawing(true);

    const newElement = currentTool === 'freehand'
      ? {
          type: 'freehand',
          startX,
          startY,
          endX: startX,
          endY: startY,
          points: [[startX, startY]] as [number, number][],
          color: currentColor
        }
      : {
          type: currentTool,
          startX,
          startY,
          endX: startX,
          endY: startY,
          color: currentColor
        };

    setCurrentElement(newElement);
  };

  // This function handles real-time drawing on the canvas while the user is actively drawing with the mouse or touch input.

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {

    // Early exit if drawing is not in progress or the current tool is not freehand or text
    if (!isDrawing || currentTool === 'select' || currentTool === 'text' || !ctx || !canvasRef.current || !currentElement) return;

    // Converts these coordinates to canvas space using getBoundingClientRect() to account for offsets like margins, borders, or scrolling.
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Creates a copy of the current element and updates its properties based on the current tool and mouse/touch coordinates.
    const updatedElement = { ...currentElement };

    // Adds the current mouse/touch coordinates to the points array for freehand drawing.
    if (currentTool === 'freehand' && updatedElement.points) {
      updatedElement.points.push([x, y]);
    } else {
      updatedElement.endX = x;
      updatedElement.endY = y;
    }

    // Updates the current element with the updated properties and redraws the canvas with the new element.
    setCurrentElement(updatedElement);
    redrawCanvas();

// Sets the stroke color using ctx.strokeStyle = currentColor.
// Depending on currentTool, it draws the appropriate shape
    ctx.strokeStyle = currentColor;
    switch(currentTool) {

      // Uses strokeRect() to draw from (startX, startY) to (x, y).

      case 'rectangle':
        ctx.strokeRect(
          updatedElement.startX,
          updatedElement.startY,
          x - updatedElement.startX,
          y - updatedElement.startY
        );
        break;

// Uses ellipse() to draw an oval centered at (startX, startY), with horizontal and vertical radii calculated from x and y
      case 'ellipse':
        ctx.beginPath();
        ctx.ellipse(
          updatedElement.startX,
          updatedElement.startY,
          Math.abs(x - updatedElement.startX),
          Math.abs(y - updatedElement.startY),
          0, 0, 2 * Math.PI
        );
        ctx.stroke();
        break;

        // Uses moveTo(startX, startY) and lineTo(x, y) to create a straight line
      case 'line':
        ctx.beginPath();
        ctx.moveTo(updatedElement.startX, updatedElement.startY);
        ctx.lineTo(x, y);
        ctx.stroke();
        break;

// Iterates through points[], connecting them with lineTo() to create a smooth hand-drawn effect.
      case 'freehand':
        if (updatedElement.points) {
          ctx.beginPath();
          ctx.moveTo(updatedElement.points[0][0], updatedElement.points[0][1]);
          updatedElement.points.forEach(point => {
            ctx.lineTo(point[0], point[1]);
          });
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
        break;
    }
  };

  // This function handles the mouseup event, which signals the end of drawing and adds the current element to the elements array.
  
  const stopDrawing = () => {
    // Early exit if drawing is not in progress or the current tool is not freehand or text
    if (!isDrawing || currentTool === 'select' || currentTool === 'text') return;

// If currentElement exists, it is added to the list of drawn elements 
    if (currentElement) {
      setElements(prev => [...prev, currentElement]);
    }
    // stops the drawing action
    setIsDrawing(false);
    // clears the current element state
    setCurrentElement(null);
    // calls redrawcanvas to render all stored element ensuring the finalized shape appears correctly
    redrawCanvas();
  };

  // The handleUndo function removes the most recently drawn element from the elements state, effectively undoing the last action.

  const handleUndo = () => {
    if(elements.length > 0){
      setElements(prev => prev.slice(0, -1));
      redrawCanvas();
    }
  };

  // The handleExport function allows users to export their drawing as a PNG image by converting the canvas content into an image file and triggering a download.
  const handleExport = () => {
    if (!canvasRef.current) return;
    
    try {
      const dataURL = canvasRef.current.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'drawing.png';
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export image. Check browser permissions.');
    }
  };


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-2 flex items-center gap-2 justify-center">
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
          onClick={handleUndo}
          className="p-2 rounded-md hover:bg-gray-100 transition-colors"
          title="Undo"
        >
          <Undo2 className="w-5 h-5" />
        </button>
        <button
          onClick={handleExport}
          className="p-2 rounded-md hover:bg-gray-100 transition-colors"
          title="Export"
        >
          <Download className="w-5 h-5" />
        </button>
      </div>

      <canvas
        ref={canvasRef}
        className="touch-none"
        onMouseDown={startDrawing}
        onMouseMove={draw}
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
export default App
