/**
 * Create an example of a JavaScript Singleton.
 * After the first object is created, it will return additional 
 * references to itself
 */

 export let commentSingleton = (function () {
    let objInstance; //private variable
    function create() { //private function to create methods and properties
        //let _segNumber = 1;
        let _comments = [];
    
        let updateData = function(comments){
            _comments = comments
        }
        let currentData = function(){
            return _comments;
        }
        return{
            updateData : updateData,
            currentData : currentData,
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