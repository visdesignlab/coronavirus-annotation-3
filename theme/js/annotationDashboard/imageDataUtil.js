export const endDrawTime = 580;
import * as d3 from 'd3';
import { getRightDimension } from '../dataManager';
import { structureSingleton } from './structureSingleton';
import { colorStructDict } from './video';
import { timeRangeSingleton } from './videoTimeSingleton';

let colorStructCurrent;

export const structureSelected = {
  selected: false,
  structure: null,
  annotations: null,
  comments: null,
  coord: null,
  color: null,
  data: null
};

export function structureSelectedToggle(coords, selectedData) {
 
  if (selectedData === null) {
    structureSelected.structure = null;
    structureSelected.annotations = null;
    structureSelected.comments = null;
    structureSelected.selected = false;
    structureSelected.coord = null;
    structureSelected.color = null;
    d3.selectAll('.memo').classed('disabled', false);
  } else {
    structureSelected.structure = selectedData.structure_name;
    structureSelected.selected = true;
    structureSelected.coord = coords;
    structureSelected.color = selectedData.color;
    structureSelected.data = selectedData;
    d3.selectAll('.memo').classed('disabled', true);
  }
}

export const doodleKeeper = [];

export const colorDictionary = {//(60,179,113)
  blue2: { code: [1, 0, 207], color: 'blue', structure: ['Cell Membrane'], other_names:['Cell Membrane', 'plasma membrane'] },
  blue: { code: [0, 0, 255], color: 'blue', structure: ['Cell Membrane'], other_names:['Cell Membrane', 'plasma membrane'] },
  purple: { code: [102, 0, 204], color: 'purple', structure: ['ACE2'], other_names:['ACE2'] },
  magenta: { code: [255, 0, 255], color: 'magenta', structure: ['ACE2'], other_names:['ACE2'] },
  red: { code: [255, 0, 0], color: 'red', structure: ['Envelope protein'], other_names:['Envelope protein', 'e protein'] },
  green: { code: [60, 179, 113], color: 'green', structure: ['Spike Protein'], other_names:['Spike Protein', 's protein', 'spike', 'spikes'] },
  orange: { code: [255, 128, 0], color: 'orange', structure: ['RNA', 'TMPRSS2'], other_names:[] },
  yellow: { code: [255, 255, 0],color: 'yellow',  structure: ['Membrane Protein'], other_names:['Membrane Protein','membrane'] },
  aqua: { code: [255,215,0], color: 'aqua', structure: ['Furin'], other_names:['Furin'] },
  teal: { code: [10, 160, 140], color: 'teal', structure: ['Spike Protein'], other_names:['Spike Protein', 's protein', 'spike', 'spikes'] },
  'light gray': { code: [200, 200, 200], color: 'light gray', structure: ['Sugars'], other_names:['Sugars'] },
  white: { code: [250, 250, 250], color: 'white', structure: ['Virus Membrane'], other_names:['Virus Membrane']},
  'dark gray': { code: [200, 200, 200], color: 'dark gray', structure: ['Nucleocapsid Protein'], other_names:['Nucleocapsid Protein', 'n protein'] },
  unknown: { code: [200, 200, 200], color: 'white', structure: ['Spike Protein'], other_names:['Spike Protein', 's protein', 'spike', 'spikes'] },
};

export const structureDictionary = {
  'CELL MEMBRANE': {code:[250, 250, 210]},
  'ACE2': {code:[138, 43, 226]},
  'ENVELOPE PROTEIN': {code:[255, 0, 0]},
  'SPIKE PROTEIN': {code:[60, 175, 113]},
  'RNA': {code:[255, 140, 0]},
  'TMPRSS2': {code:[255, 140, 0]},
  'MEMBRANE PROTEIN': {code:[255, 255, 0]},
  'FURIN': {code:[255, 255, 0]},
  'SUGARS': {code:[119, 136, 153]},
  'VIRUS MEMBRANE': {code:[250, 250, 210]},
  'NUCLEOCAPSID PROTEIN': {code:[119, 136, 153]},
}

export const getColorIndicesForCoord = (x, y, width) => {
  const red = Math.round(y * (width * 4) + (x * 4));
  return [red, red + 1, red + 2, red + 3];
};

export const currentImageData = {};

const canvas = document.getElementById('canvas');

function check(pull) {
  if (pull < 10) {
    return `0000${pull}`;
  }else if (pull < 100) {
    return `000${pull}`;
  }else if (pull < 1000) {
    return `00${pull}`;
  }else if (pull < 10000){
    return `0${pull}`;
  }
  return pull;
}

export function clearCanvas() {
  const cxt = canvas.getContext('2d');
  cxt.clearRect(0, 0, canvas.width, canvas.height);
  d3.select('#video-wrap').select('.tooltip').style('opacity', 0).style('position', '-300px')
}
export async function loadPngForFrame() {
  const video = document.getElementById('video');
  const pullFrame = (Math.floor((video.currentTime) * 30));
  let timeOb = timeRangeSingleton.getInstance();

  let structOb = await structureSingleton.getInstance();
  colorStructCurrent = await structOb.currentColorStruct(video.currentTime);

  let currentPNGS = timeOb.currentFrames();
 
  const pathImg = `../static/assets/stills/${currentPNGS}/flat`;
  // The path to the image that we want to add
  const imgPath = `${pathImg + (check(pullFrame))}.png`;
  // Create a new Image object.
  const imgObj = new Image();
  // Set the src of this Image object.
  imgObj.src = imgPath;


  imgObj.onload = function () {
    let dimension = getRightDimension();

    canvas.width = dimension.width;
    canvas.height = dimension.height;
    imgObj.width =  dimension.width;
    imgObj.height = dimension.height;
   
    const cxt = canvas.getContext('2d');
    cxt.drawImage(imgObj, 0, 0, canvas.width, canvas.height);

    const _data = cxt.getImageData(0, 0, canvas.width, canvas.height);

    currentImageData.data = _data.data.map((m, i) => {
      if ((i + 1) % 4 === 0) m = 0;
      return m;
    });
    currentImageData.width = _data.width;
    currentImageData.height = _data.height;

    cxt.putImageData(new ImageData(new Uint8ClampedArray(currentImageData.data), canvas.width, canvas.height), 0, 0);
  };
}

export function toggleQueue(offVideo){
  if(offVideo){
    let hoverQ = d3.select('#interaction').selectAll('div.hover-queue').data(['Hover over video to interact']).join('div').classed('hover-queue', true);
    hoverQ.selectAll('text').data(d=> [d]).join('text').text(d=> d);
  }else{
    d3.select('#interaction').selectAll('div.hover-queue').remove();
  }
  
}

export async function drawFrameOnPause(video) {

  if (video.currentTime < endDrawTime) {
    const imgObj = loadPngForFrame();
    toggleQueue(true);
    
  } else {
    console.log('credits are playing');
  }
}

export function colorChecker(code, hover){
  let test = hover.filter(h=> {
      return (code[0] === h[0] && code[1] === h[1] && code[2] === h[2])
  });
  return test.length > 0;
}

export function parseArray(hoverStruct) {

  const newData = { ...currentImageData };
  newData.data = Uint8ClampedArray.from([...currentImageData.data]);
 
  if(hoverStruct != "unknown"){

      for (let i = 0; i < newData.data.length; i += 4) {
        const end = i + 4;
        const snip = newData.data.slice(i, end);
        const colorBool = colorChecker(snip, hoverStruct.rgb);

        if (!colorBool) {
          newData.data[i] = 255;
          newData.data[i + 1] = 255;
          newData.data[i + 2] = 255;
          newData.data[i + 3] = 150;
        } else if (colorBool) {
          newData.data[i + 3] = 0;
          
        }
      }
    }else{
      console.log('HOVER COLOR UNKNOWN');
    }
  const cxt = canvas.getContext('2d');
  const myimg = new ImageData(newData.data, currentImageData.width, currentImageData.height);
  cxt.putImageData(myimg, 0, 0);
}

export function makeNewImageData() {
  const cxt = canvas.getContext('2d');
  const myimg = new ImageData(currentImageData.data, currentImageData.width, currentImageData.height);
  cxt.putImageData(myimg, 0, 0);
}

export function getCoordColor(coord) {
  
  const colorIndices = getColorIndicesForCoord(Math.round(coord[0]), Math.round(coord[1]), currentImageData.width);
  const [redIndex, greenIndex, blueIndex, alphaIndex] = colorIndices;
  const redForCoord = currentImageData.data[redIndex];
  const greenForCoord = currentImageData.data[greenIndex];
  const blueForCoord = currentImageData.data[blueIndex];
  const alphaForCoord = currentImageData.data[alphaIndex];
  const new_rgb = `rgba(${redForCoord},${greenForCoord},${blueForCoord}, 1.0)`;
  //('new_rgb', new_rgb);
  console.log(new_rgb);
  let filterDict = colorStructCurrent;

  let colorCodes = [redForCoord, greenForCoord, blueForCoord];

  let filterDictTest = filterDict.filter(f=> {
    let test = f.rgb.filter(rg=> {
      return (rg[0] === colorCodes[0]) && (rg[1] === colorCodes[1]) && (rg[2] === colorCodes[2]);
    })
    return test.length > 0;
  });

  return filterDictTest.length > 0 ? filterDictTest[0] : 'unknown';
}
