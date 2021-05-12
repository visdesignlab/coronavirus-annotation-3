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
        
        let _allStruct = d3.groups(await d3.csv('../static/assets/stuctured_structure_data.csv'), d=> d.Hierarchy).map(m => {
            m[1].map(v => {
                var value = v.Time;
                var json = JSON.parse("[" + value + "]");
                v.Time = json;
                return v;
            });
            return m;
        });
    
        let currentStructures = function(){
            let timeRangeS = timeRangeSingleton.getInstance();
            let currentRange = timeRangeS.currentRange();
           
            let test = [..._allStruct].map(m=> {
                let vals = m[1].filter(f=> {
                    let testTime = f.Time.filter(t=> {
                        return overlap(currentRange[0], currentRange[1], t[0], t[1]);
                    });
                    return testTime.length > 0;
                });
                m[1] = vals;
                return m;
            });
            return test;
        }
        return{
            currentStructures : currentStructures,
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