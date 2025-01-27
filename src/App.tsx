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









}
export default App
