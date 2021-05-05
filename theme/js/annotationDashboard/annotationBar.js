import * as d3 from 'd3';
import { library, dom } from '@fortawesome/fontawesome-svg-core';
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';
import { fab } from '@fortawesome/free-brands-svg-icons';
import { structureSelected } from './imageDataUtil';
import { hoverEmphasis } from './timeline';
import { annotationData } from '../dataManager';
import { playButtonChange, togglePlay } from './video';

library.add(faCheck, fas, far, fab);
dom.i2svg();
dom.watch();

export const colorArray = ['#2E86C1', '#2ECC71', '#F1C40F', '#F10F42', 'black'];

export function annoTypes() {
  const data = annotationData[annotationData.length - 1];
  return Array.from(new Set(data.map((m) => m.annotation_type))).map((m, i) => ({ type: m, color: colorArray[i] }));
}

export function clearAnnotationSidebar() {
  const annoWrap = d3.select('#left-sidebar');
  annoWrap.select('.top').selectAll('*').remove();
  
  annoWrap.select('.sel-anno-wrap').selectAll('*').remove();
  annoWrap.select('.gen-anno-wrap').selectAll('*').remove();
}

function renderAnnotationBoxes(divs){

  divs.on('click', ()=> {
    if(document.getElementById('video').playing){
      playButtonChange().then(()=> togglePlay());

    }
  })

  divs.filter(f=> f.has_unkown === 'TRUE').classed('question', true);

  const annoTime = divs.selectAll('text.time').data((d) => [d]).join('text').classed('time', true)
    .text((d) => d.video_time);

  const annoTypeHeader = divs.selectAll('h6').data((d) => [d]).join('h6');

  const annoHeadSpan = annoTypeHeader.selectAll('span').data((d) => [d]).join('span').text((d) => d.annotation_type);
  annoHeadSpan.classed('badge badge-secondary', true);

  annoTypeHeader.filter((f) => f.has_unkown === 'TRUE').selectAll('i.question').data((d) => [d]).join('i')
    .classed('fas fa-question-circle question', true);

  annoTypeHeader.filter((f) => f.ref != '' && f.ref != 'na').selectAll('i.reference').data((d) => [d]).join('i')
    .classed('fas fa-book-open reference', true);
 
  annoHeadSpan.style('background-color', (d) => 'gray');

  const annoText = divs.selectAll('text.anno-text').data((d) => [d]).join('text').text((d) => d.text_description)
    .classed('anno-text', true);

  const annoRefDiv = divs.filter((f) => f.ref != '' && f.ref != 'na').selectAll('div.ref').data(d=> [d].map(m=> {
    m.expanded = false;
    return m;
  })).join('div').classed('ref', true);

  let detail = annoRefDiv.selectAll('details').data(d=> [d]).join('details').classed('ref-detail', true);
  detail.selectAll('summary').data(d=> [d]).join('summary').text('Citation');
  let citation = detail.selectAll('text.citation-text').data(d=> [d]).join('text').classed('citation-text', true);
  citation.text(d=> d.ref);

  const annoLink = divs.filter((f) => f.url != '' && f.url != 'na').selectAll('a.link').data((d) => [d]).join('a')
      .classed('link', true)
      .text((d) => d.url);

  annoLink.attr('href', (d) => d.url);
  annoLink.attr('target', '_blank');

}

export async function updateAnnotationSidebar(data, stackedData, mouseoverBool) {

  const annoType = annoTypes();
  /// start drawing annotation
  const annoWrap = mouseoverBool ? d3.select('#left-sidebar').select('.mouse-over-wrap') : d3.select('#left-sidebar').select('#annotation-wrap');

  if(!mouseoverBool){
    clearAnnotationSidebar();
  };

  let header = d3.select('#left-sidebar').select('.top').selectAll('h6.comment-header').data(['Annotations ']).join('h6').classed('comment-header', true);
  header.text(d=> d);

  if (stackedData != null) {

    let label = function(struct){
      if(struct.toUpperCase() === "ENVELOPE PROTEIN"){ 
        return "E protein";
      }else if(struct.toUpperCase() === "MEMBRANE PROTEIN"){
        return "M protein";
      }else if(struct.toUpperCase() === "NUCLEOCAPSID PROTEIN"){
        return "N protein"
      }else{
        return struct;
      }
    }
      
    d3.select('#left-sidebar').select('.top').select('.comment-header').text(`Annotations for ${label(structureSelected.structure)}`)

    const structAnnoDivs = annoWrap.select('.sel-anno-wrap').selectAll('div.structure-anno').data(stackedData).join('div')
      .classed('structure-anno', true);

    renderAnnotationBoxes(structAnnoDivs);

    structAnnoDivs.on('mouseover', (event, d)=> hoverEmphasis(d, "annotation"));
    structAnnoDivs.on('mouseout', ()=> d3.selectAll('.hover-em').classed('hover-em', false));
    
  }else{
    d3.select('#left-sidebar').select('.top').select('.comment-header').text(`Annotations:`)
  }

  let innerAnnoDiv = mouseoverBool ? annoWrap : annoWrap.select('.gen-anno-wrap');

  const annoDiv = innerAnnoDiv.selectAll('div.anno').data(data).join('div')
    .classed('anno', true);

  renderAnnotationBoxes(annoDiv);

  annoDiv.on('mouseover', (event, d)=> hoverEmphasis(d, "annotation"));
  annoDiv.on('mouseout', ()=> d3.selectAll('.hover-em').classed('hover-em', false));

  d3.select('.annotation-wrap').selectAll('rect').filter((f) => {
    const currentData = filteredAnno.map((m) => m.text_description);
    return currentData.indexOf(f.text_description) > -1;
  }).style('fill-opacity', '1');

  d3.select('.annotation-wrap').selectAll('rect').filter((f) => {
    const currentData = filteredAnno.map((m) => m.text_description);
    return currentData.indexOf(f.text_description) === -1;
  }).style('fill-opacity', '.4');

  if (stackedData != null) annoDiv.style('opacity', 0.3);
}

export function highlightAnnotationbar(currentTime) {
  const annos = d3.selectAll('#left-sidebar').select('.gen-anno-wrap').selectAll('div.anno');
  const ttest = Array.from(new Set(annos.data().map((m) => m.seconds[0])));
  const test = ttest.filter((f) => f <= currentTime);
  const selectedAnno = annos.filter((f) => f.seconds[0] == test[test.length - 1]).classed('selected', true);

  if(selectedAnno.nodes().length > 0){
    d3.selectAll('#left-sidebar').select('#annotation-wrap').node().scrollTop = selectedAnno.nodes()[0].offsetTop;
  }
  
}
