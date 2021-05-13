import * as d3 from 'd3';
import { formatAnnotationTime } from '../dataManager';
import { timeRangeSingleton } from './videoTimeSingleton';
/**
 * Create an example of a JavaScript Singleton.
 * After the first object is created, it will return additional 
 * references to itself
 */
 function overlap(start1, end1, start2, end2){
    // """Does the range (start1, end1) overlap with (start2, end2)?"""
    return end1 >= start2 && end2 >= start1
 }
 
 export let annotationSingleton = (function () {
    let objInstance; //private variable
    async function create() { //private function to create methods and properties
        let timeRangeOb = timeRangeSingleton.getInstance();
        let _anno = formatAnnotationTime(await d3.csv(`../static/assets/annotations/${timeRangeOb.currentAnno()}`)).map((m, i) => {
            m.index = i;
            return m;
          });

        let changeAnnotations = async function(){
            _anno = formatAnnotationTime(await d3.csv(`../static/assets/annotations/${timeRangeOb.currentAnno()}`)).map((m, i) => {
                m.index = i;
                return m;
              });
        }
    
        let currentAnnotations = function(){
           return _anno;
        }
        return{
            currentAnnotations : currentAnnotations,
            changeAnnotations : changeAnnotations,
        }
    }
    return {
        getInstance: function(){
            if(!objInstance){
                objInstance = create();
            }
            return objInstance;
        }
    };
})();