import * as d3 from 'd3';
import { annotationData, dataKeeper, formatAnnotationTime, formatTime, getRightDimension, segData } from '../dataManager';
import { addCommentButton, goBackButton } from './topbar';
import {
  clearCanvas, colorDictionary, drawFrameOnPause, endDrawTime, getCoordColor, loadPngForFrame, makeNewImageData, parseArray, structureSelected, structureSelectedToggle, toggleQueue,
} from './imageDataUtil';
import {
  drawCommentBoxes, formatCommentData, updateCommentSidebar, clearRightSidebar, highlightCommentBoxes, renderCommentDisplayStructure, renderStructureKnowns,
} from './commentBar';
import { highlightAnnotationbar, updateAnnotationSidebar } from './annotationBar';
import { highlightTimelineBars, renderTimeline, colorTimeline } from './timeline';
import 'firebase/storage';
import { cancelLogin, getStorage, userLoggedIn } from '../firebaseUtil';
import { timeRangeSingleton } from './videoTimeSingleton';
import { renderSelected, renderTimeSections } from '..';
import { commentSingleton } from './commentDataSingleton';

export const currentColorCodes = [];

let canPlay;

const canvas = document.getElementById('canvas');
canvas.setAttribute('pointer-events', 'none');

export async function phaseSelected(whichOne, data) {

  d3.select('.overlay').remove();
  d3.selectAll('.sections').classed('selected', false);

  if(data.group === 4){

    let wrapperData = d3.select(whichOne.parentNode).data().map(m=> {
      let otherDat = m.data.filter(f=> f.id != data.id);
      let newDat = [data, otherDat[0]];
      m.data = newDat;
      return m;
    });

  let pGroup = d3.select(whichOne.parentNode);
  let subSegs = pGroup.selectAll('g.sections').data(wrapperData[0].data).join('g').classed('sections', true);
  subSegs.attr('transform', (d, i) => `translate(0, ${(i * 28)})`);

  let sectionRects = subSegs.selectAll('rect.section-rect').data(d => [d]).join('rect').classed('section-rect', true);
  sectionRects
  .attr('width', (d)=> {
    if( d.name === 'Additional Info'){
      return 150;
    }else{
      return 350;
    }
  }).attr('height', 20);//.attr('fill', 'red');

  let secLabels = subSegs.selectAll('text.label').data(d=> [d]).join('text').classed('label', true).text(d=> d.name);
  secLabels.attr('transform', (d, i)=> {
    if(d.group === 1){
      return `translate(100, 15)`
    }else{
      return `translate(10, 15)`
    }
  });

  const pathGen = d3.line().curve(d3.curveNatural);

  let secPaths = subSegs.append('path').attr('d', pathGen([[0, 20], [350, 20]])).join('path').attr('stroke', 'black');

    //pGroup.selectAll('')
  }else{

    d3.select(whichOne).classed('selected', true);

  }
 

  let timeRangeOb = timeRangeSingleton.getInstance();

  timeRangeOb.changeRange(data);
  let current = timeRangeOb.currentRange();

  video.currentTime = current[0];

  renderSelected(data.id);
  initializeVideo();

  const anno = formatAnnotationTime(await d3.csv(`../static/assets/annotations/${timeRangeOb.currentAnno()}`)).map((m, i) => {
    m.index = i;
    return m;
  });

  annotationData.push(anno);
 
  /**
   * Filter Annotations and render them
   */
  let filteredAnnotations = annotationData[annotationData.length-1].filter((f, i)=>{
    let start = f.seconds[0];
    let end = f.seconds[1];
    return end >= current[0] && current[1] >= start
  });
  updateAnnotationSidebar(filteredAnnotations, null, false);

  /**
   * Filter Comments and render them
   */
  let commentOb = commentSingleton.getInstance();
  updateCommentSidebar(commentOb.currentData());

  /**
   * Render Timeline
   */

  renderTimeline(commentOb.currentData());


}

function resizeVideoElements() {

  const video = document.getElementById('video');
  let dimension = getRightDimension();

  video.width = dimension.width;
  video.height = dimension.height;
  
  document.getElementById('interaction').style.width = `${Math.round(dimension.width)}px`;
  document.getElementById('interaction').style.height = `${dimension.height}px`;

  canvas.style.width = `${Math.round(dimension.width)}px`;
  canvas.style.height = `${dimension.height}px`;

  document.getElementById('video-controls').style.top = `${dimension.height + 7}px`;

  d3.select('.progress-bar').node().style.width = `${Math.round(dimension.width - 68)}px`;
  d3.select('.progress-bar').node().style['margin-left'] = '66px';

}

function initializeVideo() {
  //const videoDuration = Math.round(document.getElementById('video').duration);
  const timeRangeOb = timeRangeSingleton.getInstance();//[0,20];
  const videoDuration = timeRangeOb.currentRange();
  const time = formatTime(videoDuration);
  const duration = document.getElementById('duration');
  duration.innerText = `${time[1].minutes}:${time[1].seconds}`;
  duration.setAttribute('datetime', `${time[1].minutes}m ${time[1].seconds}s`);

  const volumeButton = document.getElementById('volume-button');
  const volume = document.getElementById('volume');
  volume.addEventListener('input', updateVolume);
  video.addEventListener('volumechange', updateVolumeIcon);
  volumeButton.addEventListener('click', toggleMute);
  volumeButton.style.border = 'none';
  volumeButton.style['background-color'] = 'transparent';

 // updateVolumeIcon();
}

// updateVolume updates the video's volume
// and disables the muted state if active
function updateVolume() {
  if (video.muted) {
    video.muted = false;
  }
  video.volume = volume.value;
}

// updateVolumeIcon updates the volume icon so that it correctly reflects
// the volume of the video
function updateVolumeIcon() {
  
  const volumeIcons = document.querySelectorAll('.volume-button g');
  const volumeButton = document.getElementById('volume-button');

  const video = document.getElementById('video');

  const volumeLow = document.querySelector("#volume-low");
  const volumeHigh = document.querySelector("#volume-high");

  volumeIcons.forEach((icon) => {
    icon.setAttribute('visibility', 'hidden');
  });

  volumeButton.setAttribute('data-title', 'Mute (m)');

  const volumeMute = document.querySelector("#volume-mute");
  if (video.muted || video.volume === 0) {
    volumeMute.setAttribute('visibility',"visible"); //.classList.remove('hidden');
    
    volumeButton.setAttribute('data-title', 'Unmute (m)');

  } else if (video.volume > 0 && video.volume <= 0.5) {
    volumeLow.setAttribute('visibility',"visible"); //.classList.remove('hidden');
  } else {
    volumeHigh.setAttribute('visibility',"visible"); //.classList.remove('hidden');
  }
}

// toggleMute mutes or unmutes the video when executed
// When the video is unmuted, the volume is returned to the value
// it was set to before the video was muted
function toggleMute() {
  
  const volume = document.getElementById('volume');
  const video = document.getElementById('video');
  video.muted = !video.muted;
  if (video.muted) {
    volume.setAttribute('data-volume', volume.value);
    volume.value = 0;
  } else {
    volume.value = volume.dataset.volume;
  }
}

function addMouseEvents2Video(){

  d3.select('#interaction')
  .on('click', (event) => mouseClickVideo(d3.pointer(event), video))
  .on('mousemove', (event) => {
    toggleQueue(false);
    mouseMoveVideo(d3.pointer(event), video);
  });

  d3.select('#interaction')
    .on('mouseenter', ()=> {
      toggleQueue(false);
    })
    .on('mouseout', ()=> {
      if(!structureSelected.selected){
        let tool = d3.select('.tooltip');
        tool.style('opacity', 0);
        tool.style('top', '-100px');
        tool.style('left', '-100px');
        clearCanvas();
        drawFrameOnPause(video);
        toggleQueue(true);
      }
    });

}

export async function formatVidPlayer() {
  const video = document.getElementById('video');
 
  video.controls = false;

  Object.defineProperty(HTMLMediaElement.prototype, 'playing', {
    get() {
      return !!(this.currentTime > 0 && !this.paused && !this.ended && this.readyState > 2);
    },
  });

  if(video.readyState >= 2) {
    
    canPlay = true;
    
    resizeVideoElements();
    drawFrameOnPause(video);
    addMouseEvents2Video();

    d3.select('#video-controls').select('.play-pause').on('click', () => {
      playButtonChange().then(()=> togglePlay());
    });
    d3.select('.progress-bar').on('click', progressClicked);

  }else{
    
    video.addEventListener('canplay', (event) => {
  
      canPlay = true;
      resizeVideoElements();
      drawFrameOnPause(video);
      addMouseEvents2Video();
  
      d3.select('#video-controls').select('.play-pause').on('click', () => {
        playButtonChange().then(()=> togglePlay());
      });
      d3.select('.progress-bar').on('click', progressClicked);
  
    });
  }

  video.addEventListener('loadedmetadata', initializeVideo);
  window.addEventListener('resize', ()=> {
 
    resizeVideoElements();
    drawFrameOnPause(video);

    let commentOb = commentSingleton.getInstance();

    renderTimeline(commentOb.currentData());
    const commentData = formatCommentData({...commentOb.currentData()});

    const timeRange = [video.currentTime < 1.5 ? 0 : Math.floor(video.currentTime - 1.5), video.currentTime + 1.5];

    const commentsInTimeframe = commentData.filter((f, i) => {
      const time = JSON.parse(f.videoTime);
      if (time.length > 1) {
        return time[0] <= video.currentTime && time[1] >= video.currentTime;
      }
      return time <= timeRange[1] && time >= timeRange[0];
    });
  
    const svgTest = d3.select('#interaction').select('svg');
    const svg = svgTest.empty() ? d3.select('#interaction').append('svg') : svgTest;

    if(d3.select('#show-push').select('input').node().checked){
      renderPushpinMarks(commentsInTimeframe, svg);
    }
    
  });
}
/*
Update format time, highlight bars
*/
export async function updateTimeElapsed(timeRange) {

  d3.select('.progress-bar-fill').style('width', `${scaleVideoTime(document.getElementById('video').currentTime)}px`);
  const timeArray = formatTime([Math.round(document.getElementById('video').currentTime)]);

  let time = timeArray.length > 1 ? timeArray : timeArray[0];
  const timeElapsed = document.getElementById('time-elapsed');
  timeElapsed.innerText = `${time.minutes}:${time.seconds}`;
  timeElapsed.setAttribute('datetime', `${time.minutes}m ${time.seconds}s`);

  highlightAnnotationbar(timeRange);
  highlightTimelineBars(timeRange);

  if(!d3.select('.template-wrap').empty()){
    d3.select('.template-wrap').select('h6').text(`Add a comment @ ${time.minutes} : ${time.seconds}`);
  }
}

function progressClicked(mouse) {
 
  const video = document.getElementById('video');
  video.currentTime = Math.round(scaleVideoTime(mouse.offsetX, true));

  let commentOb = commentSingleton.getInstance();

  if(structureSelected.selected){
    const commentData = { ...commentOb.currentData() };
    unselectStructure(commentData, video);
    d3.select('.x-out').remove();
  }

  d3.select('#time-elapsed').text(`${video.currentTime}`)
  
}

export function commentClicked(event, d) {
  document.getElementById('video').currentTime = d.videoTime;
  let commentOb = commentSingleton.getInstance();

  if(d3.select('#show-push').select('input').node().checked){
    renderPushpinMarks(commentsInTimeframe, svg);
  }
  loadPngForFrame();
  if(structureSelected.selected){
    //const commentData = { ...dataKeeper[dataKeeper.length - 1] };
    const commentData = { ...commentOb.currentData() };

    unselectStructure(commentData, video);
    d3.select('.x-out').remove();
  }
  let test = d3.selectAll('.memo').filter(f=> f.key === d.key);
}

function scaleVideoTime(currentTime, invert) {
 
  let videoTImeOb = timeRangeSingleton.getInstance();
  let duration = videoTImeOb.currentRange();
  const scale = d3.scaleLinear().range([0, video.videoWidth]).domain([duration[0], duration[1]]);

  return invert ? scale.invert(currentTime) : scale(currentTime);
}
export async function playButtonChange() {
  const div = d3.select('#video-controls').select('.play-pause');

  if (video.playing) {
   
    div.select('.pause-span').style('opacity', 0);
    div.select('.play-span').style('opacity', 1);
   
  } else {
    div.select('.pause-span').style('opacity', 1);
    div.select('.play-span').style('opacity', 0);

  }
}

// togglePlay toggles the playback state of the video.
// If the video playback is paused or ended, the video is played
// otherwise, the video is paused
export function togglePlay() {

  let commentOb = commentSingleton.getInstance();
 
  if (video.playing) {

    video.pause();
    d3.selectAll('.anno').classed('de-em', false);
    d3.selectAll('.memo').classed('de-em', false);
    drawFrameOnPause(video);

  } else {

    video.play();

    d3.select('.overlay').remove();
    d3.selectAll('.anno').classed('de-em', true);

    d3.select('.timeline-wrap').select('svg').select('.comm-group').selectAll('.comm-bin').classed('struct-present', false).select('rect').style('fill', 'rgb(105, 105, 105)');
    d3.select('.timeline-wrap').select('svg').select('.anno-group').selectAll('.anno').classed('struct-present', false).select('rect').style('fill', 'rgb(105, 105, 105)');
    clearCanvas();

    if(structureSelected.selected){
      structureSelectedToggle(null, null, null);
      clearRightSidebar();
      renderCommentDisplayStructure();
      updateCommentSidebar({ ...commentOb.currentData() });
      addCommentButton();
    }
  }
}

export async function mouseMoveVideo(coord, video) {

    if(!video.playing && (structureSelected.selected === false && video.currentTime <= endDrawTime)){
      
    const snip = getCoordColor(coord);

    if (snip != currentColorCodes[currentColorCodes.length - 1] && !video.playing && snip != 'black' && snip != 'unknown') {

      currentColorCodes.push(snip);
      parseArray(snip);
      const structFromDict = (snip === 'orange' && video.currentTime > 16) ? colorDictionary[snip].structure[1].toUpperCase() : colorDictionary[snip].structure[0].toUpperCase();
     
      const structureData = annotationData[annotationData.length - 1].filter((f) => {
        return f.associated_structures.split(', ').map((m) => m.toUpperCase()).indexOf(structFromDict) > -1});

      structureTooltip(structureData, coord, snip, true);
      
      if(!structureSelected.selected){
        d3.select('.timeline-wrap').select('svg').select('.comm-group').selectAll('.comm-bin').classed('struct-present', false).select('rect').style('fill', 'rgb(105, 105, 105)');
        d3.select('.timeline-wrap').select('svg').select('.anno-group').selectAll('.anno').classed('struct-present', false).select('rect').style('fill', 'rgb(105, 105, 105)');
        colorTimeline(snip);
      }

    } else if (snip === 'black') {

      if(!structureSelected.selected){
        d3.select('.timeline-wrap').select('svg').select('.comm-group').selectAll('.comm-bin').classed('struct-present', false).select('rect').style('fill', 'rgb(105, 105, 105)');
        d3.select('.timeline-wrap').select('svg').select('.anno-group').selectAll('.anno').classed('struct-present', false).select('rect').style('fill', 'rgb(105, 105, 105)');
      
        let tool = d3.select('.tooltip');
        tool.style('opacity', 0);
        tool.style('top', '-100px');
        tool.style('left', '-100px');
  
        makeNewImageData();
      
      }
    }
  }
}

export function unselectStructure(commentData, video){

  addCommentButton();
  clearRightSidebar();
  drawFrameOnPause(video);

  structureSelectedToggle(null, null, null);
  colorTimeline(null);

  let tool = d3.select('.tooltip');
  tool.style('opacity', 0);
  tool.style('top', '-100px');
  tool.style('left', '-100px');

  updateCommentSidebar(commentData);
}
export async function mouseClickVideo(coord, video) {

  let commentOb = commentSingleton.getInstance();
  //const commentData = { ...dataKeeper[dataKeeper.length - 1] };
  const commentData = { ...commentOb.currentData() };

  if (video.playing) {
    structureSelectedToggle(null);
   
    playButtonChange().then(()=> togglePlay());
    d3.select('.timeline-wrap').select('svg').select('.comm-group').selectAll('.comm-bin').classed('struct-present', false).select('rect').style('fill', 'rgb(105, 105, 105)');
    d3.select('.timeline-wrap').select('svg').select('.anno-group').selectAll('.anno').classed('struct-present', false).select('rect').style('fill', 'rgb(105, 105, 105)');
    const timeRange = [video.currentTime < .5 ? 0 : Math.floor(video.currentTime - .2), video.currentTime + .2];
    highlightTimelineBars(timeRange);

  } else {
    /**
     * VIDEO PAUSED - CLICKED NOT ON STRUCTURE
     */
    const snip = getCoordColor(coord);

    if (snip === 'black' || snip === 'unknown') {
    
      d3.select('.timeline-wrap').select('svg').select('.comm-group').selectAll('.comm-bin').classed('struct-present', false).select('rect').style('fill', 'rgb(105, 105, 105)');
      d3.select('.timeline-wrap').select('svg').select('.anno-group').selectAll('.anno').classed('struct-present', false).select('rect').style('fill', 'rgb(105, 105, 105)');

      const timeRange = [video.currentTime < .5 ? 0 : Math.floor(video.currentTime - .2), video.currentTime + .2];
      highlightTimelineBars(timeRange);
     
      if(!structureSelected.selected){
        playButtonChange().then(()=> togglePlay());
      }
      
     unselectStructure(commentData, video);
     d3.select('.x-out').remove();

    }else if(snip === structureSelected.color){
    
        unselectStructure(commentData, video);
        d3.select('.x-out').remove();

    } else {
      /**
       * VIDEO PAUSED - CLICKED ON STRUCTURE
       */
      if(userLoggedIn.loggedInBool === false){
        d3.select('#sign-in-wrap').selectAll('*').remove();
         cancelLogin();
      }
    
      let structure = (snip === 'orange' && video.currentTime > 16) ? colorDictionary[snip].structure[1] : colorDictionary[snip].structure[0];
      
      structureSelectedToggle(structure, coord, snip);
      colorTimeline(snip);
      let structureAnnotations = updateWithSelectedStructure(snip, commentData);
      structureTooltip(structureAnnotations, coord, snip, false);
      let dim = getRightDimension();
      let xTest = d3.select('#interaction').select('x-out');
      let x = xTest.empty() ? d3.select('#interaction').append('div').classed('x-out', true) : xTest;
      x.style('height', '50px').style('width', '50px');

      let span = x.append('span').classed('fas fa-times-circle fa-2x', true);
      span.style('width', '35px');
      span.style('height', '35px');
      span.style('position', 'absolute');
      span.style('left', `${dim.width - 45}px`);
      span.style('top', `10px`);

      x.on('click', (event, d)=>{
        event.stopPropagation();
        x.remove();
        unselectStructure(commentData, video);
      });
    }
  }
}
export function updateWithSelectedStructure(snip, commentData){
  
  parseArray(snip);

  const nestReplies = formatCommentData({ ...commentData });
  let structure = (snip === "orange" && video.currentTime > 15) ? colorDictionary[snip].structure[1] : colorDictionary[snip].structure[0];

  structureSelected.comments = nestReplies.filter((f) => {
    if(snip  === 'orange'){
      let reply = f.replyKeeper.filter(r=> {
        return r.comment.toUpperCase().includes(structure.toUpperCase());
      });
      return f.comment.toUpperCase().includes(structure.toUpperCase()) || reply.length > 0;
    }else{
      let tags = f.tags.split(',').filter(m=> {
        return colorDictionary[snip].other_names.map(on=> on.toUpperCase()).indexOf(m.toUpperCase()) > -1;
      });
      let test = colorDictionary[snip].other_names.filter(n=> f.comment.toUpperCase().includes(n.toUpperCase()));
        let reply = f.replyKeeper.filter(r=> {
          let rTest = colorDictionary[snip].other_names.filter(n=> r.comment.toUpperCase().includes(n.toUpperCase()));
          return rTest.length > 0;
        });
      return test.length > 0 || reply.length > 0 || tags.length > 0;
    }
  });

  const structureAnnotations = annotationData[annotationData.length - 1].filter((f) => {
    let structure = (snip === "orange" && video.currentTime > 15) ? colorDictionary[snip].structure[1] : colorDictionary[snip].structure[0];
    if(snip === "orange"){
      let structsAnno = f.associated_structures.split(', ').filter((m) => {
        return structure.toUpperCase() === m.toUpperCase();
      });
      return structsAnno.length > 0;
    }else{
      let structsAnno = f.associated_structures.split(', ').filter((m) => {
        let otherNames = colorDictionary[snip].other_names.map(on=> on.toUpperCase()).indexOf(m.toUpperCase());
        return otherNames > -1;
      });
      return structsAnno.length > 0;
    }
  });

  let otherAnno = annotationData[annotationData.length - 1].filter((f) => {
    let structure = (snip === "orange" && video.currentTime > 15) ? colorDictionary[snip].structure[1] : colorDictionary[snip].structure[0];
    if(snip === "orange"){
      let structsAnno = f.associated_structures.split(', ').filter((m) => {
        return structure.toUpperCase() === m.toUpperCase();
      });
      return structsAnno.length === 0;
    }else{
      let structsAnno = f.associated_structures.split(', ').filter((m) => {
        let otherNames = colorDictionary[snip].other_names.map(on=> on.toUpperCase()).indexOf(m.toUpperCase());
        return otherNames > -1;
      });
      return structsAnno.length === 0;
    }
    
  });

  structureSelected.annotations = structureAnnotations.filter((f) => f.has_unkown === 'TRUE').concat(structureAnnotations.filter((f) => f.has_unkown === 'FALSE'));

  const annoWrap = d3.select('#left-sidebar');

  goBackButton();
  clearRightSidebar();
  renderCommentDisplayStructure();

  const topCommentWrap = d3.select('#right-sidebar').select('.top');
  const genComWrap = d3.select('#comment-wrap').select('.general-comm-wrap');
  const selectedComWrap = d3.select('#comment-wrap').select('.selected-comm-wrap');
  
  // NEED TO CLEAR THIS UP - LOOKS LIKE YOU ARE REPEATING WORK IN UPDATE COMMENT SIDEBAR AND DRAW COMMETN BOXES

  updateAnnotationSidebar(otherAnno, structureSelected.annotations, false);

  renderStructureKnowns(topCommentWrap);

  const stackedData = structureSelected.annotations.filter((f) => f.has_unkown == 'TRUE').concat(structureSelected.annotations.filter((f) => f.has_unkown == 'FALSE'));
  const annos = topCommentWrap.selectAll('.anno').data(stackedData).join('div').classed('anno', true);

  const unknowns = annos.filter((f) => f.has_unkown === 'TRUE');
  unknowns.classed('unknown', true);

  // MIGHT BE REPEATING WORK - ALREADY HAVE UPDATE COMMENT SIDEBAR ABOVE
  drawCommentBoxes(structureSelected.comments, selectedComWrap);
  //drawCommentBoxes(nestReplies, genComWrap);
  genComWrap.selectAll('.memo').style('opacity', 0.3);

  d3.select('#left-sidebar').select('#annotation-wrap').node().scrollTop = 0;
  d3.select('#right-sidebar').select('#comment-wrap').node().scrollTop = 0;
  d3.select('#right-sidebar').select('#comment-wrap').style('margin-top', '200px');
  
  //MAKE THESE SCROLL TO TOP.

  return structureAnnotations;
}
export function structureTooltip(structureData, coord, snip, hoverBool) {
  let commentOb = commentSingleton.getInstance();

  const commentData = { ...commentOb.currentData() };

  const nestReplies = formatCommentData( commentData );
  let structure = (snip === "orange" && video.currentTime > 15) ? colorDictionary[snip].structure[1] : colorDictionary[snip].structure[0];
  let structureComments = nestReplies.filter((f) => {
    if(snip  === 'orange'){
      let reply = f.replyKeeper.filter(r=> {
        return r.comment.toUpperCase().includes(structure.toUpperCase());
      });
      return f.comment.toUpperCase().includes(structure.toUpperCase()) || reply.length > 0;
    }else{
      let tags = f.tags.split(',').filter(m=> {
        return colorDictionary[snip].other_names.map(on=> on.toUpperCase()).indexOf(m.toUpperCase()) > -1;
      });
      let test = colorDictionary[snip].other_names.filter(n=> f.comment.toUpperCase().includes(n.toUpperCase()));
        let reply = f.replyKeeper.filter(r=> {
          let rTest = colorDictionary[snip].other_names.filter(n=> r.comment.toUpperCase().includes(n.toUpperCase()));
          return rTest.length > 0;
        });
      return test.length > 0 || reply.length > 0 || tags.length > 0;
    }
  });

  //let structure = (snip === "orange" && video.currentTime > 16) ? colorDictionary[snip].structure[1].toUpperCase() : colorDictionary[snip].structure[0].toUpperCase();

  if (hoverBool) {
    const question = structureData.filter((f) => f.has_unkown === 'TRUE').length + structureComments.filter((f) => f.comment.includes('?')).length;
    const refs = structureData.filter((f) => f.url != '').length + structureComments.filter((f) => f.comment.includes('http')).length;

    d3.select('.tooltip')
      .style('position', 'absolute')
      .style('opacity', 1)
      .html(`<h4>${structure}</h4>
      <span class="badge badge-pill bg-dark">${structureData.length}</span> annotations for this structure. <br>
      <span class="badge badge-pill bg-dark">${structureComments.length}</span> comments for this structure. <br>
      <span class="badge badge-pill bg-danger">${question}</span> Questions. <br>
      <span class="badge badge-pill bg-primary">${refs}</span> Refs. <br>
      <br>
      <h7>Click Structure for more Info</h7>
      `).style('left', `${coord[0]+5}px`)
        .style('top', `${coord[1]+5}px`);

  } else {
    d3.select('.tooltip')
      .style('position', 'absolute')
      .style('opacity', 1)
      .html(`<h4>${structure}</h4>
    `)
      .style('left', `${coord[0]}px`)
      .style('top', `${coord[1]}px`);
  }
}
export function renderPushpinMarks(commentsInTimeframe, svg) {
  
  const pushes = commentsInTimeframe.filter((f) => f.commentMark === 'push');
  const pushedG = svg.selectAll('g.pushed').data(pushes).join('g').classed('pushed', true);
  let dimension = getRightDimension();
  pushedG.attr('transform', (d) => `translate(${(dimension.width * d.posLeft)}, ${(dimension.height * d.posTop)})`);

  const circ = pushedG.selectAll('circle').data((d) => [d]).join('circle');
  circ.attr('r', 10);

  circ.attr('cx', (d) => 0);
  circ.attr('cy', (d) => 0);

  circ.on('mouseover', (d) => {
    const wrap = d3.select('#right-sidebar').select('#comment-wrap');
    const memoDivs = wrap.selectAll('.memo').filter((f) => {
  
      return f.key === d.key});
    memoDivs.classed('selected', true);
    d3.select('#right-sidebar').select('#comment-wrap').node().scrollTop = memoDivs.nodes()[0].offsetTop;

  }).on('mouseout', (d) => {
    const wrap = d3.select('#right-sidebar').select('#annotation-wrap');
    const memoDivs = wrap.selectAll('.memo').classed('selected', false);
  });

  const annotationGroup = pushedG.selectAll('g.annotations').data((d) => [d]).join('g').classed('annotations', true);
  
  const labelRect = annotationGroup.selectAll('rect').data((d) => [d]).join('rect')
    .attr('x', 17)
    .attr('y', -20)
    .attr('width', (d)=> {
      return (d.displayName.split('').length * 9);
    })
    .attr('height', 30)
    .attr('fill', '#fff')
    .attr('fill-opacity', .9)
    .style('border-radius', '4px')


  const annotationText = annotationGroup.selectAll('text').data((d) => [d]).join('text')
    .text((d) => d.displayName)
    .classed('annotation-label', true)
    .attr('x', (d) => 22)
    .attr('y', (d) => 0);
}
export async function renderDoodles(commentsInTimeframe, div) {
  const storage = getStorage();
  const storageRef = storage.ref();

  const doods = await storageRef.child('images/').listAll();

  d3.select('#interaction').selectAll('.doodles').remove();

  const doodles = commentsInTimeframe.filter((f) => f.commentMark === 'doodle');

  const doodFromStorage = doodles.map(async (dood) => {
    const urlDood = await doods.items.filter((f) => f._delegate._location.path_ === `images/${dood.doodleName}`)[0].getDownloadURL();
    return urlDood;
  });

  let dimension = getRightDimension();
  const images = d3.select('#interaction').selectAll('.doodles').data(await Promise.all(doodFromStorage)).join('img').classed('doodles', true);
  images.attr('src', (d) => d);
  images.attr('width', dimension.width);
  images.attr('height', dimension.height);

}
export function videoUpdates(data, annoType) {
  const svgTest = d3.select('#interaction').select('svg');
  const svg = svgTest.empty() ? d3.select('#interaction').append('svg') : svgTest;
  svg.attr('id', 'vid-svg');

  const video = document.querySelector('video');

  const interDIV = d3.select('#interaction');

  d3.select('#show-doodle').select('input').on('click', (event, d) => {
    if (!event.target.checked) {
      d3.select('#interaction').selectAll('.doodles').remove();
    } else {
      let commentOb = commentSingleton.getInstance();
      const commentData = formatCommentData({...commentOb.currentData()});

      const timeRange = [video.currentTime < 1.5 ? 0 : Math.floor(video.currentTime - 1.5), video.currentTime + 1.5];
      const commentsInTimeframe = commentData.filter((f, i) => {
        const time = JSON.parse(f.videoTime);
        if (time.length > 1) {
          return time[0] <= video.currentTime && time[1] >= video.currentTime;
        }
        return time <= timeRange[1] && time >= timeRange[0];
      });
      renderDoodles(commentsInTimeframe, interDIV);
    }
  });

  d3.select('#show-push').select('input').on('click', (event, d) => {
    if (!event.target.checked) {
      d3.select('#interaction').selectAll('.pushed').remove();
    } else {
      let commentOb = commentSingleton.getInstance();

      const commentData = formatCommentData({...commentOb.currentData()});
      
      const timeRange = [video.currentTime < 1.5 ? 0 : Math.floor(video.currentTime - 1.5), video.currentTime + 1.5];
      const commentsInTimeframe = commentData.filter((f, i) => {
        const time = JSON.parse(f.videoTime);
        if (time.length > 1) {
          return time[0] <= video.currentTime && time[1] >= video.currentTime;
        }
        return time <= timeRange[1] && time >= timeRange[0];
      });

      const svgTest = d3.select('#interaction').select('svg');
      const svg = svgTest.empty() ? d3.select('#interaction').append('svg') : svgTest;

      renderPushpinMarks(commentsInTimeframe, svg);
    }
  });

  video.ontimeupdate = async (event) => {

    let timeOb = timeRangeSingleton.getInstance();
    let currentDuration = timeOb.currentRange();

   

    if(video.currentTime < currentDuration[1]){

      const timeRange = [video.currentTime < .5 ? 0 : Math.floor(video.currentTime - .2), video.currentTime + .2];

      d3.select('#video-nav').select('.progress').attr('width', (d)=> {
        let last = d.name === "Additional Info" ? 250 : 350;
        let s = d3.scaleLinear().domain(currentDuration).range([0, last]);
        return s(video.currentTime)
      });
    
      const filteredAnnotations = annotationData[annotationData.length - 1]
        .filter((f) => f.seconds[0] <= timeRange[0] && f.seconds[0] <= timeRange[1]) || (f.seconds[1] <= timeRange[1] && f.seconds[1] >= timeRange[0]);

      /**
       * UPDATE AND HIGHLGIHT ANNOTATION BAR
       */
      //updateAnnotationSidebar(filteredAnnotations, null, false);
      updateTimeElapsed(timeRange);
    
      if(video.playing){
        d3.selectAll('.anno').classed('de-em', true);
        d3.selectAll('.memo').classed('de-em', true);
      }

      /*
      COMMENT MANIPULATION HERE
    */

      highlightCommentBoxes(timeRange);

      let commentOb = commentSingleton.getInstance();
      const commentData = formatCommentData({...commentOb.currentData()});

      const commentsInTimeframe = commentData.filter((f, i) => {
        const time = JSON.parse(f.videoTime);
        if (time.length > 1) {
          return time[0] <= video.currentTime && time[1] >= video.currentTime;
        }
        return time <= timeRange[1] && time >= timeRange[0];
      });

      if (d3.select('#show-doodle').select('input').node().checked) {
        renderDoodles(commentsInTimeframe, interDIV);
      }

      if (d3.select('#show-push').select('input').node().checked) {
        renderPushpinMarks(commentsInTimeframe, svg);
      }

    }else{
   
      playButtonChange().then(()=> {
        video.pause();
        d3.selectAll('.anno').classed('de-em', false);
        d3.selectAll('.memo').classed('de-em', false);
        drawFrameOnPause(video);
      });
      
      let dim = getRightDimension();
     
      let overlayDiv = d3.select('#video-wrap').selectAll('div.overlay').data([segData]).join('div')
      .classed('overlay', true);

      overlayDiv.style('width', `${dim.width}px`).style('height', `${dim.height}px`);
      let svg = overlayDiv.selectAll('svg').data(d => [d]).join('svg');

      let navGs = svg.selectAll('g.nav').data(d =>{
        
        let test = timeRangeSingleton.getInstance();
        let sel = test.currentSeg();
        let back = +sel === 1 ? +segData.length : +sel - 1;
        let next = sel === segData.length ? 1 : sel + 1;
        console.log('back', back, next);

        return [segData[back - 1], segData[sel - 1], segData[next - 1]];
        
      }).join('g').classed('nav', true);

      let span = navGs.selectAll('span').data(d=> [d]).join('span');//.attr('height', 20).attr('width', d=> (d.name.length * 12)+10);

      navGs.selectAll('text.nav-label').data((d, i)=> {
        d.index = i;
        return [d]})
        .join('text')
        .classed('nav-label', true)
        .text((d)=> {
        if(d.index === 0){
          return `Go back to ${d.name}`;
        }else if(d.index  === 1){
          return `Replay ${d.name}`;
        }else{
          return `Go to ${d.name}`;
        }
      });
      let dims = getRightDimension();

      navGs.attr('transform', (d, i)=> `translate(${(i * (dims.width / 3))+180},${(dims.height / 2)})`);

      navGs.on('click', (target, d)=> {
        let selG = d3.selectAll('.section-group').filter(f=> {
          return f.id === d.id;
        });
      });

    }
  };
}
