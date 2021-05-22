import * as d3 from 'd3';
import { formatTime, getRightDimension, overlap } from '../dataManager';
import { updateAnnotationSidebar } from './annotationBar';
import { annotationSingleton } from './annotationSingleton';
import { formatCommentData } from './commentBar';
import { commentSingleton } from './commentDataSingleton';
import { colorDictionary, makeNewImageData, parseArray, structureSelected } from './imageDataUtil';
import { structureSingleton } from './structureSingleton';
import {playButtonChange, togglePlay, unselectStructure, updateTimeElapsed} from './video';
import { timeRangeSingleton } from './videoTimeSingleton';

const offsetX = 68;
let hoverStruct = false;

export function hoverEmphasis(d, type){
  if(type === "comment"){
    d3.select('.timeline-wrap').select('svg').select('.comm-group').selectAll('.comm-bin').filter(f=> f.key === d.key).classed('hover-em', true);
  }else{
    let filtered = d3.select('.timeline-wrap').select('svg').select('.anno-group').selectAll('.anno').filter(f=> {
      return f.key === d.key});
   
    filtered.classed('hover-em', true);
    d3.selectAll('#annotation-wrap').selectAll('.anno').filter(f=> f.key === d.key).classed('hover-em', true);
  }
}

export function colorTimeline(snip){
 
  let video = document.getElementById('video');
  d3.select('.timeline-wrap').select('svg').select('.comm-group').selectAll('.comm-bin').classed('struct-present', false).select('rect').style('fill', 'rgb(105, 105, 105)');
  d3.select('.timeline-wrap').select('svg').select('.anno-group').selectAll('.anno').classed('struct-present', false).select('rect').style('fill', 'rgb(105, 105, 105)');

  if(snip != "unknowm" && snip != null){

      snip.alias.split(',').map(f=> {
        let name = f.toUpperCase();
        
        let comm = d3.select('.timeline-wrap').select('svg').select('.comm-group').selectAll('.comm-bin').filter(c=> {
          let rep = c.replyKeeper.filter(r=> r.comment.toUpperCase().includes(name));
          return c.comment.toUpperCase().includes(name) || rep.length > 0;
        });
        comm.classed('struct-present', true).select('rect').style('fill', `#${snip.hex}`);
    
        d3.select('.timeline-wrap').select('svg').select('.anno-group').selectAll('.anno').filter(a => {
          return a.associated_structures.toUpperCase().includes(name);
      }).classed('struct-present', true).select('rect').style('fill', `#${snip.hex}`);
    
      });
  
    }
  }

//}

function structureTooltip(coord, d, type) {
  let dim = getRightDimension();
  const xScale = d3.scaleLinear().domain([0, 89]).range([0, dim.width]);
  if (type === 'comments') {
    let formatedTime = formatTime(d.videoTime);

    let blurb = d.comment.split(' ').filter((f, i)=> i < 8);
    function addS(a, stri){
      return a + " " + stri;
    }
    let stringB = blurb.reduce(addS, "")
    
    d3.select('#timeline-tooltip')
      .style('position', 'absolute') 
      .style('pointer-events', 'all')
      .style('opacity', 1)
      .html(`
        <h7 style="color:gray">${formatedTime.minutes}:${formatedTime.seconds}  - </h7>
        <h7 style="color:gray">${d.displayName}</h7><br>
        <h7>${stringB + (blurb.length > 8 ? '...' : ' ')}</h7><br>
        <h7>${d.replyKeeper.length} replies</h7>
        `)
      .style('left', `${xScale(d.videoTime)}px`)
      .style('top', '-60px');
  } else {
    
    let blurb = d.text_description.split(' ').filter((f, i)=> i < 8);
    function addS(a, stri){
      return a + " " + stri;
    }
    let stringB = blurb.reduce(addS, "")
 
    d3.select('#timeline-tooltip')
      .style('position', 'absolute')
      .style('opacity', 1)
      .html(`
      <h7 style="color:gray">${d.video_time}</h7><br>
      <h7>${stringB + "..."}</h7>
        `)
      .style('left', `${coord[0]}px`)
      .style('top', `${coord[1]}px`);
  }
}

async function renderEventsOnProgress(){
  let dim = getRightDimension();
  let rangeOb = timeRangeSingleton.getInstance();

  const xScale = d3.scaleLinear().domain(rangeOb.currentRange()).range([0, (dim.width - (offsetX + 5))]).clamp(true);

  let annoOb = await annotationSingleton.getInstance();
  let annotations = annoOb.currentAnnotations();
  
  let annoEvents = annotations.filter(f=> f.annotation_type === "event");

  let eventSVG = d3.select('.progress-bar').selectAll('svg').data([annoEvents]).join('svg');
  eventSVG.attr('width', dim.width).attr('height', 16).style('position', 'absolute').style('top', '37px').style('left', offsetX)

  let groups = eventSVG.selectAll('g.events').data(annoEvents).join('g').classed('events', true);
  groups.attr('transform', d=> `translate(${xScale(d.seconds[0])},0)`);
  groups.selectAll('circle').data(d=> [d]).join('circle').attr('cx', -7).attr('cy', 7).attr('r', 7)//.attr('fill', '#5496ff');

}

export async function renderTimeline(commentData) {

  renderEventsOnProgress();

  let test = await structureSingleton.getInstance();
  let structureData = await test.currentStructures();

  let annoOb = await annotationSingleton.getInstance();
  let annotations = annoOb.currentAnnotations();

  let dim = getRightDimension();
  let rangeOb = timeRangeSingleton.getInstance();

  const xScale = d3.scaleLinear().domain(rangeOb.currentRange()).range([0, (dim.width - (offsetX + 5))]).clamp(true);
  const div = d3.select('#main');

  let comms = formatCommentData(commentData);

  const binScale = d3.scaleLinear().range([.1, 1]).domain([0, comms.map(m=> Math.max(m.replyKeeper.length))]);
  
  let masterData = [{comments: {data: comms, label: "comments"}, annotations: {data:annotations, label: "annotations"}}];

  const timelineWrap = div.select('.timeline-wrap');
  timelineWrap.style('position', 'relative');
  timelineWrap.style('top', `${(dim.height + 60)}px`);
  const timeSVG = timelineWrap.selectAll('svg').data(masterData).join('svg');
  timeSVG.style('width', `${dim.width}px`);
  timeSVG.style('position', 'relative');
  timeSVG.style('left', `-10px`);
  timeSVG.style('top', `0px`);

  const commentGroup = timeSVG.selectAll('g.comm-group').data(d=> {
    let data = d.comments.data.filter(f=> f.videoTime >= rangeOb.currentRange()[0] && f.videoTime <= rangeOb.currentRange()[1]);
 
    return [{data:data, label:"comments"}]}).join('g').classed('comm-group', true);
  commentGroup.attr('transform', `translate(${offsetX}, 4)`)
  commentGroup.selectAll('text').data(d => [d.label]).join('text')
  .text(d=> d)
  .style('font-size', '11px')
  .style('fill', 'gray')
  .style('text-anchor', 'end')
  .attr('transform', 'translate(-3, 10)');
  
  const comBins = commentGroup.selectAll('g.comm-bin').data(d=> d.data).join('g').classed('comm-bin', true);
  comBins.attr('transform', (d, i) => `translate(${xScale(d.videoTime)}, 0)`);
  const commentBinRect = comBins.selectAll('rect').data((d) => [d]).join('rect');
  commentBinRect.attr('height', 10).attr('width', 2);
  commentBinRect.style('fill-opacity', (d, i) => binScale(d.replyKeeper.length));

  comBins.on('mouseover', (event, d) => commentBinTimelineMouseover(event, d));
  comBins.on('mouseout', (event, d) => commentBinTimelineMouseout(event, d));
  comBins.on('click', (event, d)=> {
    if(document.getElementById('video').playing){
      playButtonChange().then(()=> togglePlay());
    }
    document.getElementById('video').currentTime = d.videoTime;
 
    const comments = d3.select('#right-sidebar').select('#comment-wrap').selectAll('.memo');
    const filComm = comments.filter((f) => d.key === f.key);
    filComm.classed('selected', true);
    if(filComm.nodes().length > 0){
      d3.select('#right-sidebar').select('#comment-wrap').node().scrollTop = filComm.nodes()[0].offsetTop;  
    }
      
   // });
    if(structureSelected.selected){
      let commentOb = commentSingleton.getInstance();
      const commentData = { ...commentOb.currentData() };
      unselectStructure(commentData, document.getElementById('video'));
    }
  });

  const annoGroup = timeSVG.selectAll('g.anno-group').data(d => {
    return [d.annotations]}).join('g').classed('anno-group', true);

  annoGroup.selectAll('text').data(d => [d.label]).join('text')
  .text(d=> d).style('font-size', '11px')
  .style('fill', 'gray')
  .style('text-anchor', 'end')
  .attr('transform', 'translate(-3, 6)');

  annoGroup.attr('transform', `translate(${offsetX}, 28)`);
  
  const annos = annoGroup.selectAll('g.anno').data(d => d.data).join('g').classed('anno', true);
  const rects = annos.selectAll('rect').data((d) => [d]).join('rect');
  rects.attr('height', 6).attr('width', (d) => (xScale(d.seconds[1]) - xScale(d.seconds[0])));

  annos.attr('transform', (d, i, n) => {
    if (i > 0) {
      const chosen = d3.selectAll(n).data().filter((f, j) => j < i && f.seconds[1] > d.seconds[0]);
      return `translate(${xScale(d.seconds[0])} ${(7 * chosen.length)})`;
    }
    return `translate(${xScale(d.seconds[0])} 0)`;
  });

  annos.on('mouseover', (event, d) => {
    timelineMouseover(event, d);
    hoverEmphasis(d, 'annotation');
  })
  .on('mouseout', (event, d) => {
    timelineMouseout(event, d);
    d3.selectAll('.hover-em').classed('hover-em', false);
  });
  annos.on('click', (event, d)=> { 
    if(document.getElementById('video').playing){
      playButtonChange().then(()=> togglePlay());
    }
    document.getElementById('video').currentTime = d.seconds[0];

    if(structureSelected.selected){
      let commentOb = commentSingleton.getInstance();
      const commentData = { ...commentOb.currentData() };
      unselectStructure(commentData, document.getElementById('video'));
    }
  });

  /**
   * Render structures
   */
  timeSVG.attr('height', 700);

  const structureWrap = timeSVG.selectAll('g.structure-wrap').data([structureData]).join('g').classed('structure-wrap', true);
  structureWrap.attr('transform', `translate(${offsetX}, ${annoGroup.node().getBoundingClientRect().height + 50})`);

  let structureGroups = structureWrap.selectAll('g.struct-group').data(d => d).join('g').classed('struct-group', true);
  structureGroups.selectAll('text.big-label').data(d=> [d])
  .join('text')
  .text(d=> d[0])
  .classed('big-label', true)
  .attr('transform', `translate(0,-5)`);

  let axis = d3.axisTop(xScale);
  structureGroups.selectAll('.axis-top').data(d=> [d]).join('g').classed('axis-top', true).call(axis);

  d3.selectAll('.tick').filter((f, i) => f === rangeOb.currentRange()[0]).style('opacity', 0);
  structureGroups.selectAll('.domain').style('opacity', 0);

  structureGroups.attr('transform', (d, i, n)=>{
    if(i > 0){
      return `translate(0, ${20 + (d3.select(n[i-1]).data()[0][1].length * 21)})`;
    }
  });
  let structures = structureGroups.selectAll('g.structures').data(d => d[1]).join('g').classed('structures', true);
  let structText = structures.selectAll('.label').data(d=> [d]).join('text').classed('label', true).text(d=> d.short_name);

  structures.attr('transform', (d, i)=> `translate(0, ${11+(i*21)})`);

  let line = structures.append("line")
  .attr("x1", 0)
  .attr("y1", 0)
  .attr("x2", (dim.width - offsetX))
  .attr("y2", 0)

  let timeRangeOb = timeRangeSingleton.getInstance();
  let current = timeRangeOb.currentRange();

  let durRects = structures.selectAll('rect.dur').data(d=> {
    return d.time.filter(f=> overlap(f[0], current[0], f[1], current[1])).map(m=>{
      return {range: m, hex: d.hex, data: d};
    });
  }).join('rect').classed('dur', true);

  durRects.attr('width', d=>{
    return xScale(d.range[1]) - xScale(d.range[0]);
  }).attr('height', 10);

  durRects.filter(f=> {
    return f.hex === "FFFFFF";
  }).style('stroke-width', 1).style('stroke', 'black');

  durRects.attr('transform', d=> `translate(${(3 + xScale(d.range[0]))}, -5)`);
  durRects.attr('fill', d=> {
    return `#${d.hex}`}).style('opacity', 0.5);

  durRects.on('mouseover', async (target, d)=> {
    
    if(hoverStruct === false){
      hoverStruct = true;
      let time = document.getElementById('video').currentTime;
      let structOb = await structureSingleton.getInstance();
      let currentStruct = await structOb.currentColorStruct(time);
      let test = currentStruct.filter(f=> f.structure_name === d.data.structure_name);

      if(test.length > 0 && document.getElementById('video').paused){
        parseArray(test[0]);
      }
    }
   
  });

  durRects.on('mouseout', (target, d)=> {
    hoverStruct = false;
    makeNewImageData();
  });

  durRects.on('click', (event, d)=> {
    //updateTimeElapsed(d.data.time[0])
    document.getElementById('video').currentTime = parseFloat(d.data.time[0]);
  });

}

export function highlightTimelineBars(timeRange) {

  let time = document.getElementById('video').currentTime;

  d3.select('.timeline-wrap').selectAll('.anno')
    .filter((f) => {
      return time >= f.seconds[0] && time <= f.seconds[1];
    })
    .classed('current', true);

  d3.select('.timeline-wrap').selectAll('.anno')
    .filter((f) => time < f.seconds[0] || time > f.seconds[1])
    .classed('current', false);
}

export function commentBinTimelineMouseover(event, d) {
  d3.select(event.target.parentNode).classed('current-hover', true);

  d3.select('.progress-bar').append('div');
  if (d) {
    
    const comments = d3.select('#right-sidebar').select('#comment-wrap').selectAll('.memo');
    const filComm = comments.filter((f) => d.key === f.key);
    filComm.classed('selected', true);
    if(filComm.nodes().length > 0){
      d3.select('#right-sidebar').select('#comment-wrap').node().scrollTop = filComm.nodes()[0].offsetTop;
    }
    
    let rectNodes = d3.selectAll('.comm-bin').select('rect').nodes();
    let jump  = 960  / rectNodes.length;

    let measuereLeft = (jump * rectNodes.indexOf(event.target))

    structureTooltip([measuereLeft + (jump+5)], d, 'comments');
  }
}

export function commentBinTimelineMouseout(event, d) {
  d3.select('#progress-highlight').remove();
  d3.select(event.target.parentNode).classed('current-hover', false);
  const comments = d3.select('#right-sidebar').select('#comment-wrap').selectAll('.memo');
 comments.filter((f) => f.key === d.key).classed('selected', false);
  d3.select('#timeline-tooltip').style('opacity', 0).style('left', "-200px").style('top', "-200px");
}

export function timelineMouseover(event, d) {
  let dim = getRightDimension();
  const xScale = d3.scaleLinear().domain([0, 89]).range([0, dim.width]);
  let hoverRectWidth  =  xScale(d.seconds[1]) - xScale(d.seconds[0]);

  let progress = d3.select('.progress-bar').append('div').attr('id', 'progress-highlight')
  .style('position', 'absolute')
  .style('left', `${xScale(d.seconds[0])}px`).style('opacity', '.2')
  .style('background-color', 'orange')
  .style('border-radius', 0)
  .style('width', `${hoverRectWidth}px`);

  d3.select(event.target.parentNode).classed('current-hover', true);
  
  const filAnn = d3.select('#left-sidebar').selectAll('.anno').filter((f) => f.index === d.index).classed('selected', true);
  if(!filAnn.empty()){
     //filAnn.nodes()[0].scrollIntoView({behavior: 'smooth', block: 'nearest'});//.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
     let scroll = filAnn.nodes()[0].offsetTop;
     d3.select('#left-sidebar').select('#annotation-wrap').node().scrollTop = scroll;
  }else{
    updateAnnotationSidebar([d], null, true);
  
    d3.select('#annotation-wrap')
    .style('top', `${d3.select('#left-sidebar').select('.mouse-over-wrap').select('.anno').node().getBoundingClientRect().height + 100}px`);

  }
  
  const coord = d3.pointer(event);
  structureTooltip([(event.target.getBoundingClientRect().x - 300) + coord[0], coord[1]], d, 'anno');
}

export function timelineMouseout(event, d) {
  d3.select('#progress-highlight').remove();
  d3.select(event.target.parentNode).classed('current-hover', false);
  d3.select('#left-sidebar').selectAll('.anno').filter((f) => f.index === d.index).classed('selected', false);

  d3.select('#timeline-tooltip').style('opacity', 0).style('left', "-200px").style('top', "-200px").style('pointer-events', 'none');
  d3.select('#left-sidebar').select('.mouse-over-wrap').selectAll('*').remove();
  d3.select('#annotation-wrap').style('top', '50px');
}
