import React , {useEffect,useState,useRef} from 'react';
import { Square, Circle, Minus, Edit3, Type, Undo2, Download, MousePointer, Palette } from 'lucide-react';

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
}


function App() {
  // refrences the canvas Element to draw on
  const canvasRef=useRef<HTMLCanvasElement>(null);
  // stores the canvas context for rendering
  const [ctx,setCtx]-useState<CanvasRenderingContext2D | null>(null);
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


}
export default App
