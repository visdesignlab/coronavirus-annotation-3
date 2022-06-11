/**
 * Create an example of a JavaScript Singleton.
 * After the first object is created, it will return additional 
 * references to itself
 */

 export let timeRangeSingleton = (function () {
    let objInstance; //private variable
    //class:'sec-one', stills:'sec1_2600', group: 1, name: 'Entry', id : 1, frames:[1, 2600], range:[0,86], annotations: 'annotation3.csv'
    function create() { //private function to create methods and properties
        let _segId = 1;
        let _range = [0,86];
        let _anno = 'annotation_3.csv';
        // let _stills = 'sec1_2600';
        let _stills = 'flatImages';
        let _frames = [1,2600];
    
        let changeRange = function(data){

            _range = data.range;
            _segId = data.id;
            _stills = data.stills;
            _anno = data.annotations;
            _frames = data.frames;
        }
        let currentRange = function(){
            return _range;
        }
        let currentSeg = function(){
            return _segId;
        }
        let currentStills = function(){
            return _stills;
        }
        let currentFrames = function(){
            return _stills;
        }
        let currentAnno = function(){
            return _anno;
        }
        return{
            currentSeg : currentSeg,
            currentRange : currentRange,
            changeRange: changeRange,
            currentAnno : currentAnno,
            currentStills: currentStills,
            currentFrames: currentFrames

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

//let obj1 = obj.getInstance();
// let obj2 = obj.getInstance();