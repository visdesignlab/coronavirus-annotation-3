import * as d3 from 'd3';
import { json } from 'd3';
import { annotationData, currentUser, dataKeeper, formatTime, formatVideoTime, getRightDimension } from '../dataManager';
import { checkDatabase, getDB, getStorage, userLoggedIn, userLogin } from '../firebaseUtil';
import { updateAnnotationSidebar } from './annotationBar';
import { annotationSingleton } from './annotationSingleton';
import { commentSingleton } from './commentDataSingleton';
import { structureSelected, doodleKeeper, structureSelectedToggle, structureDictionary } from './imageDataUtil';
import { hoverEmphasis } from './timeline';
import { goBackButton } from './topbar';
import { commentClicked, renderPushpinMarks, renderDoodles, togglePlay, playButtonChange } from './video';
import { timeRangeSingleton } from './videoTimeSingleton';

// require('firebase/auth');
// require('firebase/database');

let openedReplies = []

function addKey(key){
 openedReplies.push(key);
}

function removeKey(key){
  openedReplies = openedReplies.filter(f=> f != key);
}

export function clearRightSidebar() {
  d3.select('#right-sidebar').select('#sign-in-wrap-wrap').selectAll('*').remove();
  d3.select('#right-sidebar').select('.top').selectAll('*').remove();
  d3.select('#comment-wrap').selectAll('*').remove();
}

export function updateCommentSidebar() {
 
  renderCommentDisplayStructure();

  const wrap = d3.select('#right-sidebar').select('#comment-wrap').select('.general-comm-wrap');

  //FILTER RANGE//
  let timeRangeOb = timeRangeSingleton.getInstance();
  let range = timeRangeOb.currentRange();

  let commentOb = commentSingleton.getInstance();

  let comments = commentOb.currentData();
 
  const commentData = formatCommentData({...comments});

  const nestReplies = commentData.filter(f=>{
    return f.videoTime <= range[1] && f.videoTime >= range[0];
  });

  drawCommentBoxes(nestReplies, wrap);

  let time = document.getElementById('video').currentTime;
  console.log('stucture selected???', structureSelected)
  if(!structureSelected.selected){
    let signIn = d3.select('#sign-in-wrap-wrap').select('#sign-in-wrap').empty() ? d3.select('#sign-in-wrap-wrap').append('div').attr('id', 'sign-in-wrap') : d3.select('#sign-in-wrap-wrap').select('#sign-in-wrap')
    let header = d3.select('#right-sidebar').select('.top').selectAll('h6.comment-header').data(['Comments']).join('h6').classed('comment-header', true);
    d3.select('#comment-wrap').style('margin-top', 0);
    header.text(d=> d);
    const timeRange = [time < .5 ? 0 : Math.floor(time - .2), time + .2];
    highlightCommentBoxes(timeRange);
  }else{
    console.log('stucture selected', structureSelected)
    let header = d3.select('#right-sidebar').select('.top').selectAll('h6.comment-header').data([]).join('h6').classed('comment-header', true);
    header.text(d=> d);
  }


}

function recurse(parent, replyArray, level) {
  parent.level = level;
  parent.replyBool = false;

  const replies = replyArray.filter((f) => f.replies.toString() === parent.key).map(r=> {
    r.collapsed = true;
    return r;
  });

  if (replies.length > 0) {
    parent.replyKeeper = replies;
    const nextlevel = ++level;
    parent.replyKeeper.map((m) => recurse(m, replyArray, nextlevel));
    return parent;
  }
  parent.replyKeeper = [];
  return parent;
}

function replyInputBox(d, n) {
  
  const inputDiv = d3.select(n).select('.reply-space').append('div').classed('text-input-sidebar', true);
  inputDiv.append('text').text(`${userLoggedIn.displayName}:`);
  inputDiv.append('textarea').attr('id', 'text-area-id').attr('placeholder', 'Comment Here');
  const submit = inputDiv.append('button').text('Add Comment').classed('btn btn-secondary', true);

  submit.on('click', (event) => {
    event.stopPropagation();// user, currentTime, mark, tag, coords, replyTo, quote

    let text = d3.select('#text-area-id').node().value;

    const dataPush = formatComment2Send(userLoggedIn, d3.select('video').node().currentTime, 'none', 'none', null, d.key, null, text);
    const ref = getDB().ref('comments');
    d3.select(n).select('.reply-space').selectAll('*').remove();
    ref.push(dataPush);
  });
}

export function formatCommentData(dbRef) {

 if(dbRef.comments){
 
  let commentOb = commentSingleton.getInstance();
  let comments = commentOb.currentData();

 

  const dataAnno = Object.entries(comments.comments)
    .map((m) => {
      const value = m[1];
      value.key = m[0];
      return value;
    });

    // const dataAnno = Object.entries(dbRef.comments)
    // .map((m) => {
    //   const value = m[1];
    //   value.key = m[0];
    //   return value;
    // });

  const unresolved = dataAnno.filter((f) => f.resolved === false);

  const data = unresolved.filter((f) => f.replies === 'null').sort((a, b) => a.videoTime - b.videoTime);

  const replyData = unresolved.filter((f) => f.replies != 'null');

  const nestReplies = data.map((d, i, n) => recurse(d, replyData, 0));

  return nestReplies;

 }else{
   return dbRef
 }


}

export function highlightCommentBoxes(timeRange) {
  const memoDivs = structureSelected.selected ? d3.select('#right-sidebar').select('#comment-wrap').select('.selected-comm-wrap').selectAll('.memo') : d3.select('#right-sidebar').select('#comment-wrap').selectAll('.memo');
  memoDivs.classed('selected', false);
  const selectedMemoDivs = memoDivs.filter((f) => f.videoTime <= timeRange[1] && f.videoTime >= timeRange[0]).classed('selected', true);
  if (!selectedMemoDivs.empty()) {
    d3.select('#right-sidebar').select('#comment-wrap').node().scrollTop = selectedMemoDivs.nodes()[0].offsetTop;
  }
}

function updateTags(node, tagWrap, tagArray) {
  tagArray.push(node.value);

  const tags = tagWrap.selectAll('span.badge').data(tagArray).join('span').classed('badge badge-secondary', true);
  tags.text((d) => `${d}  `);
  const x = tags.append('text').text('X');
  x.style('padding', '5px');
  x.style('cursor', 'pointer');
  x.on('click', (event, d) => {
    d3.select(event.target.parentNode).remove();
    tagArray = tagArray.filter((f) => f != d);
  });

  node.value = '';
}

function upvoteIcon(div, db) {
  // UPVOTE
  const upVote = div.selectAll('.upvote-span').data((d) => [d]).join('span').classed('upvote-span', true);
  upVote.selectAll('.upvote').data((d) => [d]).join('i').classed('upvote fas fa-thumbs-up fa-sm', true);
  upVote.selectAll('.up-text').data((d) => [d]).join('text').classed('up-text', true)
  .text((d) => {
 
    let test = d.upvote.split(',').filter(f => f != "");
   
    return `: ${test.length} `});
    console.log('current user',currentUser)

  if(currentUser.length > 0){

    upVote.on('click', (event, d) => {
      console.log('upvote', d);

      let idArray = d.upvote.split(',').filter(f => f != "");
      let id = currentUser[currentUser.length - 1].uid;
    
      let test = ()=>{
        if(idArray.includes(id)){
          idArray = idArray.filter(f=> f != id)
         }else{
          idArray.push(id);
         } 
        if(idArray.length === 0){
          return "";
        }else{
          return idArray.reduce((string, c, i)=>{
            return string + `,${c}`;
          });
        }
      }
       
      db.ref(`comments/${d.key}/upvote`).set(`${test()}`);
    });
  }else{
    upVote.classed('deactivite', true);
  }

}

function downvoteIcon(div, db) {
  // DOWNVOTE
  const downvote = div.selectAll('.downvote-span').data((d) => [d]).join('span').classed('downvote-span', true);
  downvote.selectAll('.downvote').data((d) => [d]).join('i').classed('downvote fas fa-thumbs-down fa-sm', true);
  downvote.selectAll('.down-text').data((d) => [d]).join('text').classed('down-text', true)
    .text((d) => {
      let test = d.downvote.split(',').filter(f => f != "");
      return `: ${test.length} `});

  if(currentUser.length > 0){
    downvote.on('click', (event, d) => {
    
      let idArray = d.downvote.split(',').filter(f => f != "");
      let id = currentUser[currentUser.length - 1].uid;
    
      let test = ()=>{

        if(idArray.includes(id)){
          idArray = idArray.filter(f=> f != id)
         }else{
          idArray.push(id);
         } 
        
        if(idArray.length === 0){
          return "";
        }else{
          return idArray.reduce((string, c, i)=>{
            return string + `,${c}`;
          });
        }
      }
    
      db.ref(`comments/${d.key}/downvote`).set(`${test()}`);
    });
  }else{
    downvote.classed('deactivite', true);
  }
}

function renderReplyDetails(div){
  const qreply = div.selectAll('.reply-memo').filter(f=> f.comment.includes('?')).classed('question', true);
  qreply.selectAll('div.question').data((d) => [d]).join('div').classed('question', true);
  qreply.selectAll('div.question').selectAll('*').remove();
  if(!qreply.empty()){
    d3.select(qreply.node().parentNode).selectAll('i.fas.question').data((d) => [d]).join('i').classed('fas question fa-question-circle', true);
  }

  const refReply = div.selectAll('.reply-memo').filter(f=> f.comment.includes('http') || f.comment.includes('et al')).classed('reference', true);
  //d3.select(refReply.node().parentNode).selectAll('.fas.question').remove();
  if(!refReply.empty()){
    d3.select(refReply.node().parentNode).selectAll('.fas.question').data((d) => [d]).join('i').classed('fas question fa-question-circle', true);
  }
 
}

export function drawCommentBoxes(nestedData, wrap) {
  
//  const testWrap = wrap.empty() ? d3.select('#right-sidebar').append('div') : wrap;
  const db = getDB();
  console.log('draw comment buttons', nestedData);
  if(wrap.classed('selected-comm-wrap')){
    wrap.selectAll('h7').data(['Associated Comments ']).join('h7').text(d => d);
  }

  const memoDivs = wrap.selectAll('.memo').data(nestedData).join('div').classed('memo', true);

  memoDivs.selectAll('.name').data((d) => [d]).join('span').classed('name', true)
    .selectAll('text')
    .data((d) => [d])
    .join('text')
    .text((d) => `${d.displayName}:`);

  memoDivs.selectAll('.time').data((d) => [d]).join('span').classed('time', true)
    .selectAll('text')
    .data((d) => [d])
    .join('text')
    .text((d) => formatVideoTime(d.videoTime));

  const tags = memoDivs.selectAll('.tag-span').data((d) => [d]).join('span').classed('tag-span', true);
  tags.selectAll('.badge').data((d) => d.tags.split(',').filter((f) => f != 'none')).join('span').classed('badge badge-secondary', true)
    .text((d) => d);

  ///COLORING BADGES BY STRUCTURE
  
  Object.entries(structureDictionary).forEach((d)=>{
    tags.selectAll('.badge').filter(f=> {
      return f.toUpperCase() === d[0];
    }).style('background-color', `rgba(${d[1].code[0]}, ${d[1].code[1]}, ${d[1].code[2]}, .4)`);
  });
  
  let pushDivs = memoDivs.filter(f=> f.commentMark === 'push').select('.name').selectAll('.fa-map-marker-alt').data(d=> [d]).join('i').classed('fas marks fa-map-marker-alt', true);
  let doodDivs = memoDivs.filter(f=> f.commentMark === 'doodle').select('.name').selectAll('.fa-paint-brush').data(d=> [d]).join('i').classed('fas marks fa-paint-brush', true);

  memoDivs.selectAll('.comment').data((d) => [d]).join('span').classed('comment', true)
    .selectAll('text')
    .data((d) => [d])
    .join('text')
    .text((d) => d.comment);

    let infoWrap = memoDivs.selectAll('.info-wrap').data((d) => [d]).join('div').classed('info-wrap', true);

    infoWrap.selectAll('.post-time').data((d) => [d]).join('div').classed('post-time', true)
      .selectAll('text')
      .data((d) => [d])
      .join('text')
      .text((d) => {
        const test = new Date(d.postTime);
        return `on ${test.toUTCString()}`;
      });
  

  memoDivs.style('border', (d) => '1px solid gray');
  let voteDiv = memoDivs.selectAll('div.votes').data(d=> [d]).join('div').classed('votes', true);
  upvoteIcon(voteDiv, db);
  downvoteIcon(voteDiv, db);

  if (userLoggedIn.loggedInBool) {
    // RESOLVE
    // const resolve = memoDivs.filter((f) => f.uid === userLoggedIn.uid).selectAll('.resolve-span').data((d) => [d]).join('span')
    //   .classed('resolve-span', true)
    //   .text('Resolve ');

    // resolve.selectAll('.resolve').data((d) => [d]).join('i').classed('resolve', true)
    //   .classed('resolve fas fa-check', true);

    // resolve.on('click', (d) => {
    //   db.ref(`comments/${d.key}/resolved`).set('true');
    // });
    // REPLY
    const reply = memoDivs.selectAll('.reply-span').data((d) => [d]).join('span').classed('reply-span', true)
    let replyText = reply.selectAll('.replyText').data(d=> [d]).join('span').classed('replyText', true)
    .text('Reply ').text('Reply ');
    reply.selectAll('.reply').data((d) => [d]).join('i').classed('fas fa-comment-dots fa-lg reply', true);// .style('float', 'right')//.text('Reply');

    memoDivs.selectAll('.reply-span').on('click', function (event, d) {
    
      event.stopPropagation();
      const e = reply.nodes();
      const i = e.indexOf(this);

      if (d.replyBool === false) {
        d.replyBool = true;
        d3.select(event.target.parentNode).select('.replyText').text('Cancel Reply');

        replyInputBox(d, event.target.parentNode.parentNode);

      } else {
        d.replyBool = false;
        d3.select(event.target.parentNode.parentNode).select('.reply-space').select('.text-input-sidebar').remove();
        d3.select(event.target.parentNode).select('.replyText').text('Reply');
      }
    });
  }

  let replySpace = memoDivs.selectAll('div.reply-space').data(d=> [d]).join('div').classed('reply-space', true);

  memoDivs.on('click', (event, d) => {
    if (event.target.tagName.toLowerCase() === 'textarea'
          || event.target.tagName.toLowerCase() === 'button'
          || event.target.tagName.toLowerCase() === 'a'
          || event.target.tagName.toLowerCase() === 'svg') {

     
    } else {
      if(document.getElementById('video').playing){
        playButtonChange().then(()=> togglePlay());
      }
      commentClicked(event, d);
    }
  });
  memoDivs.on('mouseover', (event, d)=>{

    d3.select(event.target).classed('hover', true);
    hoverEmphasis(d, 'comment');

    let timeRange = [(video.currentTime < 1 ? 0 : video.currentTime - .2), (video.currentTime + .5)];
    
    if(d.videoTime >= timeRange[0] && d.videoTime <= timeRange[1]){
      
      if(d.commentMark === "push"){

        if(d3.select('#show-push').select('input').node().checked){
          let pushed = d3.select('#vid-svg').selectAll('.pushed').filter(f=> f.key != d.key && !f.clicked);
          pushed.selectAll('circle').attr('opacity', .1);
          pushed.selectAll('rect').attr('opacity', 0);
          pushed.selectAll('text').attr('opacity', 0);
        }else{
          renderPushpinMarks([d], d3.select('#vid-svg'));
        }
      }
   
      if(d.doodle === true){
     
        if(d3.select('#show-doodle').select('input').node().checked){
      
        }else{
          
          renderDoodles([d], d3.select('#interaction'));
        }
      }
    }
  }).on('mouseout', (event, d)=>{

     d3.select(event.target).classed('hover', false);
     d3.selectAll('.hover-em').classed('hover-em', false);
    
    if(d3.select('#show-push').select('input').node().checked){
      let pushed = d3.select('#vid-svg').selectAll('.pushed').filter(f=> !f.clicked);
      pushed.selectAll('circle').attr('opacity', .7);
      pushed.selectAll('rect').attr('opacity', .9);
      pushed.selectAll('text').attr('opacity', 1);
    }else{
      d3.select('#vid-svg').selectAll('.pushed').filter(f=> !f.clicked).remove();
      d3.select('#interaction').selectAll('.doodles').remove();
    }
    
  })

  let replyWrap = memoDivs.selectAll('.reply-wrap').data(r => [r]).join('div').classed('reply-wrap', true);

  let replyExpandDiv = replyWrap.selectAll('div.expand-div').data(e => [e]).join('div').classed('expand-div', true);

  let replyCount = replyExpandDiv.selectAll('text').data(r=> [r]).join('text').text(r=> {
        if(r.replyKeeper.length === 1){
          return `${r.replyKeeper.length} Reply`;
        }else{
          return `${r.replyKeeper.length} Replies`;
        }
      }).style('font-size', '12px');

    
//THESE ARE THE REPLIES THAT ARE OPEN.
      let replyDrawn = replyWrap.filter(f=> {
        return openedReplies.indexOf(f.key) > -1;
      });

      let expand = replyExpandDiv.selectAll('span.expand').data(d=> [d]).join('span').classed('expand', true);
      expand.selectAll('.car').data(c=> [c]).join('i').attr('class', c=> {
        if(c.repliesCollapsed === true){
          return "car fas fa-chevron-circle-down";
        }else{
          return "car fas fa-chevron-circle-up";
          
        }
      });

      expand.style('float', 'right');
      expand.style('padding-left', '200px');

      function findTarget(event, tagName){
        if(tagName === "DIV"){
          return event.target.parentNode.parentNode;
        }else if(tagName === "path"){
          return event.target.parentNode.parentNode.parentNode.parentNode;
        }else{
          return event.target.parentNode.parentNode.parentNode;
        }
      }

      replyExpandDiv.on('click', (event, d)=> {
        if(d.repliesCollapsed === false){
          d.repliesCollapsed = true;
          removeKey(d.key);
          let target = findTarget(event, event.target.tagName);
          d3.select(target).selectAll('.reply-memo').remove();
        }else{
          d.repliesCollapsed = false;
          addKey(d.key);
          let target = findTarget(event, event.target.tagName);
          recurseDraw(d3.select(target));
          renderReplyDetails(d3.select(target));
        }
      });

      replyDrawn.each((rd, i, n)=> {
        recurseDraw(d3.select(n[i]));
          renderReplyDetails(d3.select(n[i]));
      })


  const questionMemos = memoDivs.filter((f) => {
    return f.comment.includes('?')});
  questionMemos.classed('question', true);
  const qs = questionMemos.select('.info-wrap').selectAll('div.question').data((d) => [d]).join('div').classed('question', true);
  qs.select('*').remove();

  qs.selectAll('i.fas.question').data((d) => [d]).join('i').classed('fas question fa-question-circle', true);

  const refMemos = memoDivs.filter(f=> {
    return f.comment.includes('http') || f.comment.includes('et al')}).classed('reference', true);

 // refMemos.selectAll('.fa-book-open').remove();
  refMemos.select('.info-wrap').selectAll('.fa-book-open').data((d) => {
    return [d]}).join('i').classed('fas fa-book-open', true);

  
  renderReplyDetails(memoDivs);

  d3.selectAll('.reply-memo').selectAll('.reply-span').on('click', function (event, d){
    event.stopPropagation();
    const e = d3.selectAll('.reply-memo').nodes();
    const i = e.indexOf(this);

    if (d.replyBool === false) {
      d.replyBool = true;
      replyInputBox(d, event.target.parentNode.parentNode);
      d3.select(event.target.parentNode).select('.replyText').text('Cancel Reply');
    } else {
      d.replyBool = false;
      d3.select(event.target.parentNode.parentNode).select('.reply-space').select('.text-input-sidebar').remove();
      d3.select(event.target.parentNode).select('.replyText').text('Reply');
    }
  });
  
}

export function recurseDraw(selectDiv) {
  const replyDivs = selectDiv.selectAll('.reply-memo').data((d) => d.replyKeeper).join('div').classed('reply-memo', true);
  replyDivs.style('margin-left', (d) => `${d.level * 3}px`);

  replyDivs.each((d, i, n) => {
    replyRender(d3.select(n[i]));
    if (d.replyKeeper.length > 0) {
      recurseDraw(d3.select(n[i]));
    }
  });
}

export const tagOptions = [
  { key: 'question', color: '#2E86C1' },
  { key: 'suggestion', color: '#2ECC71' },
  { key: 'issue', color: '#F1C40F' },
  { key: 'context', color: '#F10F42' },
  { key: 'other', color: 'black' },
];

export function renderStructureKnowns(topCommentWrap) {
  
  const questions = structureSelected.annotations.filter((f) => f.has_unkown === 'TRUE').length + structureSelected.comments.filter((f) => f.comment.includes('?')).length;
  const refs = structureSelected.annotations.filter((f) => f.url != '').length + structureSelected.comments.filter((f) => f.comment.includes('http')).length;

  let foundDiv = topCommentWrap.selectAll('div.found-info').data([structureSelected]).join('div').classed('found-info', true);
  foundDiv.html(`<h4>${structureSelected.structure}</h4>
    <span class="badge badge-pill bg-dark">${structureSelected.annotations.length}</span> annotations for this structure. <br>
    <span class="badge badge-pill bg-dark">${structureSelected.comments.length}</span> comments for this structure. <br>
    <span class="badge badge-pill bg-danger">${questions}</span> Questions. <br>
    <span class="badge badge-pill bg-primary">${refs}</span> Refs. <br>
    <br>
    `);

  const infoButton = foundDiv.selectAll('button').data(d=> [d]).join('button').classed('btn btn-outline-secondary add-comment-structure', true);

  if (userLoggedIn.loggedInBool) {
    infoButton.text('Add comment for this structure')
      .on('click', (event, d) => {
        topCommentWrap.selectAll('*').remove();
        let tool = d3.select('.tooltip');
        tool.style('opacity', 0);
        tool.style('top', '-100px');
        tool.style('left', '-100px');
        const structArray = [structureSelected.structure.toString()];
        formatToComment(topCommentWrap, structArray);
        d3.select('#comment-wrap').style('margin-top', '420px');
      });
  } else {
    infoButton.text('Log in to comment on this')
      .on('click', (event, d) => {
        let testSign = d3.select('#right-sidebar').select('#sign-in-wrap');
        let signIn = testSign.empty() ? d3.select('#right-sidebar').append('div').attr('id', 'sign-in-wrap') : testSign;
        signIn.append('div').attr('id', 'sign-in-container');
        d3.select('#comment-wrap').style('margin-top', '150px');
        d3.select('#right-sidebar').select('.found-info').remove();
        userLogin();
        goBackButton();
      });
  }
}

export function defaultTemplate(div, tagArray) {
  let time = ()=>{
    let secs = document.getElementById('video').currentTime;
    let mins = secs > 60 ? Math.round(secs/60) : 0;
    let newSecs = secs > 60 ? secs % mins : secs;

    return {minutes: mins, seconds: newSecs}
  }//formatTime(document.getElementById('video').currentTime);

  const inputDiv = div.select('.template-wrap');

  const templatehtml = `
    <h6>Add a comment @ ${time().minutes} : ${time().seconds}</h6>
    <p>Add a comment to the video. If this is about a structure, please add the structure name as a tag.</p> 
    `;

  inputDiv.append('div').classed('temp-text', true).html(templatehtml);

  inputDiv.append('textarea').attr('id', 'text-area-id').attr('placeholder', 'Comment Here');

  let tagLabel = inputDiv.append('div').classed('tag-label', true);
  tagLabel.append('span').append('h6').text('Add tags to your comment');
  tagLabel.append('span').append('text').text('This helps others find and read your comments')

  addTagFunctionality(inputDiv, tagArray);
}

export function addTagFunctionality(inputDiv, tagArray) {
  const inputWrap = inputDiv.append('div').classed('tag-input-wrap', true);

  const tagWrap = inputWrap.append('div').classed('tag-wrap', true);

  const tags = tagWrap.selectAll('span.badge').data(tagArray).join('span').classed('badge badge-secondary', true);

  if (tagArray.length > 0) {
    tags.text((d) => `${d}  `);
    const x = tags.append('text').text('X');
    x.style('padding', '5px');
    x.style('cursor', 'pointer');
    x.on('click', (event, d) => {
      d3.select(event.target.parentNode).remove();
      tagArray = tagArray.filter((f) => f != d);
    });
  }

  const tagText = inputWrap.append('input').attr('id', 'tag-input');
  tagText.classed('form-control', true);
  tagText.node().type = 'text';
  tagText.node()['aria-label'] = 'tag add';
  tagText.node().placeholder = 'Type to add tag...';

  const node = document.getElementById('tag-input');
  node.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
      if (node.value != '') {
        updateTags(node, tagWrap, tagArray);
      } else {
        console.log('nothing to add');
      }
    }
  });
  let comOb = commentSingleton.getInstance();
  let commentData = comOb.currentData();

  const array = ({ ...commentData }).comments;
  const test = Object.entries(array).map((m) => m[1]).flatMap((m) => {
    m.tags.split(',')});
  autocomplete(node, Array.from(new Set(test)));
}

export function radioBlob(div, t1Ob, t2Ob, t3Ob, className) {
  let labelDiv = div.append('div').classed('mark-input-label', true);

  labelDiv.append('span').append('h6').text('Mark video for comment');
  labelDiv.append('span').append('text')
  .text('Mark the video to better explain your comment. Select what kind of mark and mouseover the video to add it.');

  const form = div.append('form').classed(className, true);
  const labelOne = form.append('label').classed('container', true);
  labelOne.text(t1Ob.label);
  labelOne.node().for = 't1';

  const inputOne = labelOne.append('input').attr('id', 't1');
  inputOne.node().name = 'radio';
  inputOne.node().type = 'radio';
  inputOne.node().checked = true;

  const inputCheck1 = labelOne.append('span').classed('checkmark', true);
  form.node().value = 't1';

  const labelTwo = form.append('label').classed('container', true).text(t2Ob.label);
  labelTwo.node().for = 't2';

  const inputTwo = labelTwo.append('input').attr('id', 't2');
  inputTwo.node().name = 'radio';
  inputTwo.node().type = 'radio';
  inputTwo.node().checked = false;

  const inputCheck2 = labelTwo.append('span').classed('checkmark', true);

  const labelThree = form.append('label').classed('container', true).text(t3Ob.label);
  labelThree.node().for = 't3';

  const inputThree = labelThree.append('input').attr('id', 't3');
  inputThree.node().name = 'radio';// .attr('name', 'comment')
  inputThree.node().type = 'radio';// .attr('type', 'radio');
  inputThree.node().checked = false;

  const inputCheck3 = labelThree.append('span').classed('checkmark', true);

  inputOne.on('click', (event) => {
    inputOne.node().checked = true;
    inputTwo.node().checked = false;
    form.node().value = 't1';
    t1Ob.callBack();
  });

  inputTwo.on('click', (event) => {
    inputOne.node().checked = false;
    inputTwo.node().checked = true;
    form.node().value = 't2';
    t2Ob.callBack();
    // }
  });

  inputThree.on('click', (event) => {
    inputOne.node().checked = false;
    inputTwo.node().checked = false;
    inputThree.node().checked = true;
    form.node().value = 't3';
    t3Ob.callBack();
    // }
  });

  return form;
}

export function doodleSubmit(commentType, user, tags, currentTime, text) {
  const storage = getStorage();
  const storageRef = storage.ref();
  const message = doodleKeeper[doodleKeeper.length - 1].data;

  const imagesRef = storageRef.child(`images/im-${user.uid}-${doodleKeeper[doodleKeeper.length - 1].index}.png`);

  imagesRef.putString(message, 'data_url').then((snapshot) => {
    const coords = !d3.select('#push-div').empty() ? [d3.select('#push-div').style('left'), d3.select('#push-div').style('top')] : null;

    const dataPush = formatComment2Send(user, currentTime, 'doodle', tags.data().toString(), coords, null, null, text);
    dataPush.doodle = true;
    dataPush.doodleName = snapshot.metadata.name;
    const fdb = getDB();
    const refCom = fdb.ref(commentType);

    refCom.push(dataPush);

    checkDatabase([updateCommentSidebar]);
  });
}

export function clearBoard() {
  const canvas = d3.select('canvas').node();
  const context = canvas.getContext('2d');

  context.clearRect(0, 0, canvas.width, canvas.height);

  const interactionDiv = d3.select('#interaction');
  interactionDiv.selectAll('*').remove();
  d3.select('#add-mark').remove();
}

export function formatDoodleCanvas() {
  const frame = 'video';
  const div = document.getElementById('main');

  clearBoard();

  let oldX; let
  oldY;
  let draw = false; 

  const interactionDiv = d3.select('#video-wrap').append('div').attr('id', 'add-mark');
  const video = document.getElementById('video');
  let dim = getRightDimension();
  interactionDiv.node().style.width = `${dim.width}px`;
  interactionDiv.node().style.height = `${dim.height}px`;

  interactionDiv.on('mouseenter', (event) => {
    const coords = d3.pointer(event);

    if (d3.select('#push-div').empty() && d3.select('.media-tabber').node().value === 't3') {
      const pushDiv = interactionDiv.append('div').attr('id', 'push-div');
      pushDiv.style('position', 'absolute');
      pushDiv.style('top', (d) => `${coords[1]}px`);
      pushDiv.style('left', (d) => `${coords[0]}px`);
      const push = pushDiv.append('div').classed('push', true);
      push.append('i').classed('fas fa-paint-brush', true);
    }
  });

  const leftSpace = d3.select('#left-sidebar').node().getBoundingClientRect().width;

  interactionDiv.on('mousemove', (event) => {
    const coords = d3.pointer(event);
    const pushDiv = d3.select('#push-div');
    if (!pushDiv.empty()) {
      pushDiv.style('top', (d) => `${coords[1]}px`);
      pushDiv.style('left', (d) => `${coords[0]}px`);
    }
  });

  interactionDiv.on('mouseleave', () => {
    d3.select('#push-div').remove();
    draw = false;
  });

  const canvas = d3.select(div).select('canvas').node();

  const context = canvas.getContext('2d');
  const videoDim = document.getElementById(frame).getBoundingClientRect();

  canvas.width = dim.width;
  canvas.height = dim.height;

  context.strokeStyle = 'red';
  context.lineWidth = 5;



  div.onmousedown = function (e) {
    const sideWidth = document.getElementById('right-sidebar').getBoundingClientRect();

    oldX = (e.pageX - (sideWidth.width));
    oldY = (e.pageY - 55);

    draw = true;
  };
  div.onmousemove = function (e) {
    const sideWidth = document.getElementById('right-sidebar').getBoundingClientRect();

    const mouseX = (e.pageX - (sideWidth.width));
    const mouseY = (e.pageY - 55);

    if (draw) {
      context.beginPath();
      context.moveTo(oldX, oldY);
      context.lineTo(mouseX, mouseY);
      context.stroke();
      context.closePath();
      oldX = mouseX;
      oldY = mouseY;
    }
  };
  div.onmouseup = async function (e) {
    draw = false;

    const urlTest = canvas.toDataURL('image/png');

    const storage = getStorage();
    const storageRef = storage.ref();

    const message = urlTest;
    const listPromis = await Promise.resolve(storageRef.child('images/').listAll());

    doodleKeeper.push({ index: listPromis.items.length, data: message });
  };

  return div;
}

export function formatPush() {

  clearBoard();
  const interactionDiv = d3.select('#video-wrap').append('div').attr('id', 'add-mark');
  const video = document.getElementById('video');
  let dim = getRightDimension();
  interactionDiv.node().style.width = `${dim.width}px`;
  interactionDiv.node().style.height = `${dim.height}px`;

  let clickedBool = false;

  if (d3.select('.media-tabber').node().value === 't2') {
    interactionDiv.on('mouseenter', (event) => {
      const coords = d3.pointer(event);

      if (d3.select('#push-div').empty()) {
        const dims = interactionDiv.node().getBoundingClientRect();

        const pushDiv = interactionDiv.append('div').attr('id', 'push-div');
        pushDiv.style('position', 'absolute');
        pushDiv.style('top', (d) => `${coords[1] - (dims.top - 50)}px`);
        pushDiv.style('left', (d) => `${coords[0]}px`);
        const push = pushDiv.append('div').classed('push', true);
        push.append('i').classed('fas fa-map-marker-alt fa-3x', true);
      }
    });

    interactionDiv.on('mousemove', (event) => {
      const dims = document.getElementById('video').getBoundingClientRect();
      const coords = d3.pointer(event);
      const pushDiv = d3.select('#push-div');
      if (!pushDiv.empty() && !clickedBool) {
        pushDiv.style('top', (d) => `${coords[1] - (dims.top - 50)}px`);
        pushDiv.style('left', (d) => `${coords[0] - 10}px`);
      }
    });

    interactionDiv.on('mouseleave', (event) => {
      if (!clickedBool) {
        d3.select('#push-div').remove();
      }
    });
  }

  interactionDiv.on('click', (event) => {
    event.stopPropagation();

    if (clickedBool === false && d3.select('.media-tabber').node().value === 't2') {
      // const inputDiv = d3.select('#push-div').append('div').classed('comment-initiated', true);
      // inputDiv.append('h6').text('Comment for this spot');
      // inputDiv.style('margin-left', '15px');
      // inputDiv.style('margin-top', '5px');
    } else {
      d3.select('#push-div').select('.comment-initiated').remove();
    }
    clickedBool === true ? clickedBool = false : clickedBool = true;
  });
}

export function noMarkFormat() {
  const canvas = d3.select('canvas').node();
  const context = canvas.getContext('2d');

  context.clearRect(0, 0, canvas.width, canvas.height);

  d3.select('#add-mark').remove();
}

export function renderCommentDisplayStructure() {
  const topTest = d3.select('#right-sidebar').select('.top');
  const top = topTest.empty() ? d3.select('#right-sidebar').append('div').classed('top', true) : topTest;
  let wrapTest = d3.select('#right-sidebar').select('#comment-wrap');
  const wrap = wrapTest.empty() ? d3.select('#right-sidebar').append('div').attr('id', 'comment-wrap') : wrapTest;

  wrap.select('.template-wrap').remove();
  const selTest = wrap.select('.selected-comm-wrap');
  const sel = selTest.empty() ? wrap.append('div').classed('selected-comm-wrap', true) : selTest;
  const genTest = wrap.select('.general-comm-wrap');
  const gen = genTest.empty() ? wrap.append('div').classed('general-comm-wrap', true) : genTest;

  wrap.node().scrollTop -= 100;
  
}

export function formatComment2Send(user, currentTime, mark, tag, coords, replyTo, quote, text) {

  return {
    uid: user.uid,
    displayName: user.displayName,

    videoTime: currentTime,
    postTime: new Date().toString(),

    comment: text,//d3.select('#text-area-id').node().value,
    commentMark: mark,
    tags: tag === '' ? 'none' : tag,

    posTop: coords != null ? coords[1] : null,
    posLeft: coords != null ? coords[0] : null,

    upvote: "",
    downvote: "",

    replies: replyTo === null ? 'null' : replyTo,
    quotes: quote === null ? 'null' : quote,
    resolved: false,
  };
}

export function formatToComment(div, startingTags) {
  const templateWrap = div.append('div').classed('template-wrap', true);

  defaultTemplate(div, startingTags);

  const t1Ob = { label: 'No spatial reference', callBack: noMarkFormat };
  const t2Ob = { label: 'Mark a Point', callBack: formatPush };
  const t3Ob = { label: 'Draw', callBack: formatDoodleCanvas };

  const form = radioBlob(div, t1Ob, t2Ob, t3Ob, 'media-tabber');
  noMarkFormat();

  const submitDiv = div.append('div').classed('button-wrap', true);
  let submit = submitDiv.append('button').attr('id', 'comment-submit-button').text('Add Comment').classed('btn btn-secondary', true);
  const commentType = 'comments';

  submit.on('click', async (event) => {

    event.stopPropagation();
   
    const user = userLoggedIn;
    d3.select('.timeline-wrap').select('svg').select('.comm-group').selectAll('.comm-bin').classed('struct-present', false).select('rect').style('fill', 'rgb(105, 105, 105)');
    d3.select('.timeline-wrap').select('svg').select('.anno-group').selectAll('.anno').classed('struct-present', false).select('rect').style('fill', 'rgb(105, 105, 105)');

    if (d3.select('#text-area-id').node().value != '') {

      let text = d3.select('#text-area-id').node().value;
      const tags = d3.select('.tag-wrap').selectAll('.badge');
      const { currentTime } = document.getElementById('video');

      let commentText = d3.select('#text-area-id').node();

      if (form.node().value === 't2') {
        const vidWidth = +d3.select('#push-div').style('left').split('px')[0] / +d3.select('video').node().getBoundingClientRect().width;
        const vidHeight = +d3.select('#push-div').style('top').split('px')[0] / +d3.select('video').node().getBoundingClientRect().height;

        const coords = !d3.select('#push-div').empty() ? [vidWidth, vidHeight] : null;
        const dataPush = formatComment2Send(user, currentTime, 'push', tags.data().toString(), coords, null, null, text);
        const fdb = getDB();
        const refCom = fdb.ref(commentType);
        refCom.push(dataPush);

        d3.select('#add-mark').remove();

        if(structureSelected.selected){

          structureSelectedToggle(null, null, null);
          checkDatabase([updateCommentSidebar]);

        }else{
          checkDatabase([updateCommentSidebar]);
        }

      } else if (form.node().value === 't3') {
        doodleSubmit(commentType, user, tags, currentTime, text);
        d3.select('#add-mark').remove();

        const canvas = d3.select('canvas').node();
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);

        if(structureSelected.selected){

          structureSelectedToggle(null, null, null);
          checkDatabase([updateCommentSidebar]);

        }else{
          checkDatabase([updateCommentSidebar]);
        }

      } else {
        const coords = null; // user, currentTime, mark, tag, coords, replyTo, quote
        const dataPush = formatComment2Send(user, currentTime, 'none', tags.data().toString(), coords, null, null, text);
        const fdb = getDB();
        const refCom = fdb.ref(commentType);
        refCom.push(dataPush);
        checkDatabase([]);
        d3.select('#add-mark').remove();

        if(structureSelected.selected){

          structureSelectedToggle(null, null, null);
          checkDatabase([updateCommentSidebar]);
          //updateWithSelectedStructure(structureSelected.color, dataKeeper[dataKeeper.length -  1]);

        }else{
          checkDatabase([updateCommentSidebar]);
        }
      }

      d3.select('.add-comment').select('button').text('Add Comment');

      clearRightSidebar();
      renderCommentDisplayStructure();
   
      checkDatabase([updateCommentSidebar]);

      let annoOb = await annotationSingleton.getInstance();
      let annotations = await annoOb.currentAnnotations();
      updateAnnotationSidebar(annotations, null, null);

    } else {
      window.alert('Please add a comment first');
    }
  });
}

export function formatTimeControl(div) {
  const timeWrap = div.append('div').attr('id', 'time-wrap');
  const controlDiv = timeWrap.append('div').attr('id', 'control');
  const svg = controlDiv.append('svg');

  const playR = svg.append('g').attr('id', 'play-r');
  playR.node().viewBox = '0 0 24 24';
  playR.append('path').attr('d', 'M8.016 5.016l10.969 6.984-10.969 6.984v-13.969z');

  const pauseR = svg.append('g').attr('id', 'pause-r').classed('hidden', true);
  pauseR.node().viewBox = '0 0 24 24';
  pauseR.append('path').attr('d', 'M14.016 5.016h3.984v13.969h-3.984v-13.969zM6 18.984v-13.969h3.984v13.969h-3.984z');

  const timeUpdate = timeWrap.append('div').attr('id', 'time-update');
  timeUpdate.append('text').text('00:00');

  updatePlayButton();

}

function replyRender(replyDivs) {
  const db = getDB();

  replyDivs.selectAll('.name').data((d) => [d]).join('span').classed('name', true)
    .selectAll('text')
    .data((d) => [d])
    .join('text')
    .text((d) => `${d.displayName} replied:`);

  replyDivs.selectAll('.comment').data((d) => [d]).join('span').classed('comment', true)
    .selectAll('text')
    .data((d) => [d])
    .join('text')
    .text((d) => d.comment);

  let infoWrap = replyDivs.selectAll('.info-wrap').data((d) => [d]).join('div').classed('info-wrap', true);

  infoWrap.selectAll('.post-time').data((d) => [d]).join('div').classed('post-time', true)
    .selectAll('text')
    .data((d) => [d])
    .join('text')
    .text((d) => {
      const test = new Date(d.postTime);
      return `on ${test.toUTCString()}`;
    });

  let voteDivR = replyDivs.selectAll('div.votes').data(d=> [d]).join('div').classed('votes', true);
  upvoteIcon(voteDivR, db);
  downvoteIcon(voteDivR, db);

  if (userLoggedIn.loggedInBool) {
    const reply = replyDivs.selectAll('.reply-span').data((d) => [d]).join('span').classed('reply-span', true);
    let replyText = reply.selectAll('.replyText').data(d=> [d]).join('span').classed('replyText', true)
      .text('Reply ');

    replyDivs.selectAll('div.reply-space').data(d => [d]).join('div').classed('reply-space', true);

    reply.selectAll('.reply').data((d) => [d]).join('i').classed('far fa-comment-dots reply', true)
      .style('float', 'right');

    // const resolve = replyDivs.filter(f =>{
    //   return f.displayName === userLoggedIn.displayName;
    // }).selectAll('.resolve-span').data((d) => [d]).join('span').classed('resolve-span', true)
    //   .text('Resolve ');
    // resolve.selectAll('.resolve').data((d) => [d]).join('i').classed('resolve', true)
    //   .classed('resolve fas fa-check', true);// .text(d=> `${d.displayName}:`);

    // resolve.on('click', (event, d) => {
    //   //db.ref(`comments/${d.key}/resolved`).set('true');
    // });

    reply.on('click', (event, d)=> {
 
      if (d.replyBool === false) {
        d.replyBool = true;
        d3.select(event.target.parentNode).select('.replyText').text('Cancel Reply');

        replyInputBox(d, event.target.parentNode.parentNode);

      } else {
        d.replyBool = false;
        d3.select(event.target.parentNode.parentNode).select('.reply-space').select('.text-input-sidebar').remove();
        d3.select(event.target.parentNode).select('.replyText').text('Reply');
      }
    });

  }
}

export function renderNav(div, nav) {
  const buttons = d3.select(div).selectAll('button').data(nav).join('button');
  buttons.text((d) => d.key);
  buttons.classed('btn btn-secondary', true);
  buttons.attr('id', (d) => `button-${d.key}`);
  buttons.on('click', (event, d) => {
    if (d.key === 'draw') {
      if (d.selectedBool === false) {
        d.selectedBool = true;
        document.getElementById('video').setAttribute('pointer-events', 'none');
        d.callback();
      } else {
        d.selectedBool = false;

        d.callback();
      }
    } else {
      d.callback();
    }
  });
}

export function toggleMagic() {
  d3.select('.togg-wrap').selectAll('input')
    .on('click', (event, d) => {
      if (event.target.value === 'draw') {
        formatDoodleCanvas();
      } else {
        // annotateCircle();
        formatPush();
      }
    });
}

function autocomplete(inp, arr) {
  /* the autocomplete function takes two arguments,
    the text field element and an array of possible autocompleted values: */
  let currentFocus;
  /* execute a function when someone writes in the text field: */
  inp.addEventListener('input', function (e) {
    let a; let b; let i; const
      val = this.value;
    /* close any already open lists of autocompleted values */
    closeAllLists();
    if (!val) { return false; }
    currentFocus = -1;
    /* create a DIV element that will contain the items (values): */
    a = document.createElement('DIV');
    a.setAttribute('id', `${this.id}autocomplete-list`);
    a.setAttribute('class', 'autocomplete-items');
    /* append the DIV element as a child of the autocomplete container: */
    this.parentNode.appendChild(a);
    /* for each item in the array... */
    for (i = 0; i < arr.length; i++) {
      /* check if the item starts with the same letters as the text field value: */
      if (arr[i].substr(0, val.length).toUpperCase() == val.toUpperCase()) {
        /* create a DIV element for each matching element: */
        b = document.createElement('DIV');

        /* make the matching letters bold: */
        b.innerHTML = `<strong>${arr[i].substr(0, val.length)}</strong>`;
        b.innerHTML += arr[i].substr(val.length);
        /* insert a input field that will hold the current array item's value: */
        b.innerHTML += `<input type='hidden' value='${arr[i]}'>`;
        /* execute a function when someone clicks on the item value (DIV element): */
        b.addEventListener('click', function (e) {
          /* insert the value for the autocomplete text field: */
          inp.value = this.getElementsByTagName('input')[0].value;
          /* close the list of autocompleted values,
                  (or any other open lists of autocompleted values: */
          closeAllLists();
        });
        a.appendChild(b);

        d3.select(b).on('click', () => {
          updateTags(d3.select('#tag-input').node(), d3.select('.tag-wrap'), d3.select('.tag-wrap').selectAll('span').data());
        });
      }
    }
  });
  /* execute a function presses a key on the keyboard: */
  inp.addEventListener('keydown', function (e) {
    let x = document.getElementById(`${this.id}autocomplete-list`);

    if (x) x = x.getElementsByTagName('div');
    if (e.keyCode == 40) {
      /* If the arrow DOWN key is pressed,
          increase the currentFocus variable: */
      currentFocus++;
      /* and and make the current item more visible: */
      addActive(x);
    } else if (e.keyCode == 38) { // up
      /* If the arrow UP key is pressed,
          decrease the currentFocus variable: */
      currentFocus--;
      /* and and make the current item more visible: */
      addActive(x);
    } else if (e.keyCode == 13) {
      /* If the ENTER key is pressed, prevent the form from being submitted, */
      e.preventDefault();
      if (currentFocus > -1) {
        /* and simulate a click on the "active" item: */
        if (x) {
          x[currentFocus].click();
        }
      }
    }
  });
  function addActive(x) {
    ``;
    /* a function to classify an item as "active": */
    if (!x) return false;
    /* start by removing the "active" class on all items: */
    removeActive(x);
    if (currentFocus >= x.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = (x.length - 1);
    /* add class "autocomplete-active": */
    x[currentFocus].classList.add('autocomplete-active');
  }
  function removeActive(x) {
    /* a function to remove the "active" class from all autocomplete items: */
    for (let i = 0; i < x.length; i++) {
      x[i].classList.remove('autocomplete-active');
    }
  }
  function closeAllLists(elmnt) {
    /* close all autocomplete lists in the document,
      except the one passed as an argument: */
    const x = document.getElementsByClassName('autocomplete-items');
    for (let i = 0; i < x.length; i++) {
      if (elmnt != x[i] && elmnt != inp) {
        x[i].parentNode.removeChild(x[i]);
      }
    }
  }
  /* execute a function when someone clicks in the document: */
  document.addEventListener('click', (e) => {
    closeAllLists(e.target);
  });
}
