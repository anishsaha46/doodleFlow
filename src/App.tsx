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







}
export default App
