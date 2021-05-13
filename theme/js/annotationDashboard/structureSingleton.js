import * as d3 from 'd3';
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

 export let structureSingleton = (function () {
    let objInstance; //private variable
    async function create() { //private function to create methods and properties
        let timeOb = timeRangeSingleton.getInstance();
        let seg = timeOb.currentSeg();
        
        let _allStruct = d3.groups(await d3.csv(`../static/assets/structures/stuctured_structures_seg${seg}.csv`), d=> d.hierarchy).map(m => {
            m[1].map(v => {
                var value = v.time;
                var json = JSON.parse("[" + value + "]");
                v.time = json;
                return v;
            });
            return m;
        });
        let _flatStruct  =  _allStruct.flatMap(f=> {
            return f[1].map(m =>{
                m.rgb = JSON.parse("[" + m.rgb + "]")[0];
                return m;
            });
        });
       // let _currentHover = _allStruct

       let currentColorStruct = function(currentTime){
           console.log('does flat struct exist',_flatStruct)
        return _flatStruct.filter(f=> {
                let test = f.time.filter(t=> currentTime <= t[1] && currentTime >= t[0]);
                console.log(test, currentTime)
                return test.length > 0;
            });

       }
    
        let currentStructures = async function(){
            console.log('firing');
            let timeRangeS = timeRangeSingleton.getInstance();
            let currentRange = timeRangeS.currentRange();
            let seg = timeRangeS.currentSeg();
            _allStruct = d3.groups(await d3.csv(`../static/assets/structures/stuctured_structures_seg${seg}.csv`), d=> d.hierarchy).map(m => {
                m[1].map(v => {
                    var value = v.time;
                    var json = JSON.parse("[" + value + "]");
                    v.time = json;
                    return v;
                });
                return m;
            });

            _flatStruct  =  _allStruct.flatMap(f=> {
                return f[1].map(m =>{
                    m.rgb = JSON.parse("[" + m.rgb + "]")[0];
                    return m;
                });
            });
            
            let test = [..._allStruct].map(m=> {
                let vals = m[1].filter(f=> {
                    let testTime = f.time.filter(t=> {
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
            currentColorStruct : currentColorStruct,
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