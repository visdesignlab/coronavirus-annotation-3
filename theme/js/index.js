import 'core-js/stable';
import 'regenerator-runtime/runtime';
import * as d3 from 'd3';

import { library, dom } from '@fortawesome/fontawesome-svg-core';
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';
import { fab } from '@fortawesome/free-brands-svg-icons';
import { updateAnnotationSidebar } from './annotationDashboard/annotationBar';
import { formatVidPlayer, phaseSelected, videoUpdates } from './annotationDashboard/video';
import { updateCommentSidebar } from './annotationDashboard/commentBar';
import { renderTimeline } from './annotationDashboard/timeline';
import { structureSelected } from './annotationDashboard/imageDataUtil';
import { timeObj, timeRangeSingleton } from './annotationDashboard/videoTimeSingleton';
import { structureSingleton } from './annotationDashboard/structureSingleton';

const {
  renderUser, addCommentButton, toggleSort, renderIssueButton, addInfoBlurb,
} = require('./annotationDashboard/topbar');
const { formatAnnotationTime, annotationData, segData } = require('./dataManager');
const { checkUser, loadConfig, fbConfig, loadFirebaseApp } = require('./firebaseUtil');

loadConfig();

library.add(faCheck, fas, far, fab);
dom.i2svg();
dom.watch();

d3.select('#wrapper').on('mousemove', (event, d)=>{
  let svg = document.getElementById('vid-svg');
  
  if(event.target != svg && structureSelected.selected === false){
    let tool = d3.select('.tooltip');
    tool.style('opacity', 0);
    tool.style('top', '-100px');
    tool.style('left', '-100px');
  }
});

//renderTimeSections(segData);

let timeRangeOb = timeRangeSingleton.getInstance();
let videoRange = timeRangeOb.currentRange();

renderTimeSections(segData);

export function renderSelected(selectedId){

  let sectionGroups = d3.select('#video-nav').select('svg').selectAll('.sections');

  sectionGroups.selectAll('.progress-underlay').remove();
  sectionGroups.selectAll('.progress').remove();

  let selectedGroup = sectionGroups.filter((f)=> f.id === selectedId).classed('selected', true);

  let progressRectUnderlay = selectedGroup.append('rect').attr('width', (d)=> {
    if( d.name === 'Additional Info'){
      return 250;
    }else{
      return 350;
    }
  }).attr('height', 3).classed('progress-underlay', true);

  progressRectUnderlay.attr('transform', 'translate(0, 21)');

  let progressRect = selectedGroup.append('rect').attr('width', 5).attr('height', 3).classed('progress', true);
  progressRect.attr('transform', 'translate(0, 21)');
}

export function renderTimeSections(segmentData){
  
  let groups = Array.from(new Set(segData.map(m=> m.group))).map(m=> {
    return {group: m, data: segData.filter(f=> f.group === m)}});

  let segSVG = d3.select('#video-nav').append('svg').classed('section-svg', true);
  let sectionGroups = segSVG.selectAll('g.section-group').data(groups).join('g').classed('section-group', true);
 
  let subSegs = sectionGroups.selectAll('g.sections').data(d => d.data).join('g').classed('sections', true);
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
    return `translate(10, 15)`
  });

  const pathGen = d3.line().curve(d3.curveNatural);

  let secPaths = subSegs.append('path').attr('d', pathGen([[0, 20], [350, 20]])).join('path').attr('stroke', 'black');

  secPaths.filter(f=> {
    return f.name === "Additional Info";
  }).style("stroke-dasharray", ("3, 3"));

  subSegs.on('click', function (event, d){
  
    phaseSelected(this, d);
  });

  let selectedId = 1;
  renderSelected(selectedId);

  sectionGroups.attr('transform', (d, i)=> {

      return `translate(${(i * 354)},0)`;
   
    });
}

let safariAgent = navigator.userAgent.indexOf("Safari") > -1; 
let chromeAgent = navigator.userAgent.indexOf("Chrome") === -1; 
if(navigator.userAgent.match(/Android/i)
|| navigator.userAgent.match(/webOS/i)
|| navigator.userAgent.match(/iPhone/i)
|| navigator.userAgent.match(/iPad/i)
|| navigator.userAgent.match(/iPod/i)
|| navigator.userAgent.match(/BlackBerry/i)
|| navigator.userAgent.match(/Windows Phone/i)){
 
  console.log('using mobile device');
  window.alert("Hey there! You are viewing this on a mobile device or tablet and the video interactivity will not work. Please view on desktop or laptop for best functionality")
}else if(safariAgent && chromeAgent){
  window.alert("You are using Safari or Edge and this video may not load correctly. Please use Firefox or Chrome for best performance.");
}


init();

async function init() {
  // const anno = formatAnnotationTime(await d3.csv('../static/assets/annotations/annotation_3.csv')).map((m, i) => {
  //   m.index = i;
  //   return m;
  // });

  const anno = formatAnnotationTime(await d3.csv(`../static/assets/annotations/${timeRangeOb.currentAnno()}`)).map((m, i) => {
    m.index = i;
    return m;
  });

  annotationData.push(anno);

  loadFirebaseApp();

  await checkUser([renderUser], [updateCommentSidebar, renderTimeline]);

  renderIssueButton(d3.select('#top-bar').select('#user'));
  updateAnnotationSidebar(anno, null, null);

  formatVidPlayer().then(()=> {
    d3.select('#loader').remove();
  });

  videoUpdates();

  d3.select('#about').on('mouseover', (event, d)=> {
    addInfoBlurb();
  }).on('mouseout', (event, d)=> {
    d3.select('body').select('.info-blurb').remove();
  });

  // // create a tooltip
  const tooltipTest = d3.select('#main').select('div.tooltip');
  const tooltip = tooltipTest.empty() ? d3.select('#main').append('div').classed('tooltip', true) : tooltipTest;

  tooltip.style('opacity', 0)
    .attr('class', 'tooltip')
    .style('background-color', 'white')
    .style('border', 'solid')
    .style('border-width', '2px')
    .style('border-radius', '5px')
    .style('padding', '5px');

  d3.select('#sort-by').select('input').on('click', (event) => toggleSort(event));
}
