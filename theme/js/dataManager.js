export const dataKeeper = [];
export const currentUser = [];
export const annotationData = [];

export const originalDimension = {width: 970, height:540, margin: 80};
export const middleDimension = {width: 820, height: 450, margin: 70};
export const smallerDimension = {width: 730, height: 405, margin: 70};

export function overlap(start1, start2, end1, end2){
  return (end1 >= start2 && end2 >= start1)
}
  
export function getRightDimension(){
  if(window.innerWidth < 1330){
    return smallerDimension;
  }else if(window.innerWidth > 1596){
    return originalDimension;
  }else{
    return middleDimension;
  }
}

export let segData = [
  //section 1 (entry): frames 1-2600
  {class:'sec-one', stills:'sec1_2600', group: 1, name: 'Entry', id : 1, frames:[1, 2600], range:[0,86], annotations: 'annotation_3.csv', structure_data:'stuctured_structure_data.csv'},
  //section 2 (early translation): frames 2601-8035
  {class: 'sec-two', stills:'sec2_8035', group: 2, name: 'Early Translation', id : 2, frames:[2601, 8035], range:[90,267], annotations: 'Annotation_Margot.csv', structure_data:'stuctured_structures_seg2.csv'},
    // section 3 (transcription overview): frames 8036-11245
  {class: 'sec-three', stills:'sec3_11245', group: 3, name: 'Transcription Overview', id : 3, frames:[8036, 11245], range:[268,374], annotations: 'Annotation_Ann.csv', structure_data:'stuctured_structure_data.csv'},
  // section 4 (transcription, hypothesis 1): frames 11246 - 13106
  {class: 'sec-four', stills:'sec4_13106', group: 4, name: 'Transcription, Hypothesis 1', id : 4, frames:[11246, 13106], range:[375,436], annotations: 'Annotation_Ann.csv', structure_data:'stuctured_structure_data.csv'},
  // section 5 (transcription, hypothesis 2): frames 13107- 15174
  {class: 'sec-five', stills:'sec5_15174', group: 4, name: 'Transcription, Hypothesis 2', id : 5, frames:[13107, 15174], range:[437,505], annotations: 'Annotation_Ann.csv', structure_data:'stuctured_structure_data.csv'},
];

export function formatTime(timeInSeconds) {
  console.log(timeInSeconds, new Date(timeInSeconds[0]));
  const result = timeInSeconds.length === 1 ? [new Date(timeInSeconds * 1000).toISOString().substr(11, 8)] : [new Date(timeInSeconds[0] * 1000).toISOString().substr(11, 8), new Date(timeInSeconds[1] * 1000).toISOString().substr(11, 8)];
  return result.map((m, i)=> {
    return {
            minutes: m.substr(3, 2),
            seconds: m.substr(6, 2),
            }
  });
}

export function formatVideoTime(videoTime) {
  //This formats the comment time
  const time = parseInt(videoTime);
  const minutes = Math.floor(time / 60);
  const seconds = (time - (minutes * 60));

  return `${minutes}:${(`0${seconds}`).slice(-2)}`;
}

export function formatAnnotationTime(d) {
  return d.map((m) => {
    if (m.video_time.includes('-')) {
      const range = m.video_time.split('-');

      const start = range[0].split(':');
      const startSec = (+start[0] * 60) + +start[1];

      const end = range[1].split(':');
      const endSec = (+end[0] * 60) + +end[1];
      m.seconds = [startSec, endSec];
    } else {
      const time = m.video_time.split(':');

      const seconds = (+time[0] * 60) + +time[1];

      m.seconds = [seconds];
    }

    return m;
  });
}
