import firebase from 'firebase/app';
import { currentUser } from './dataManager';
import * as d3 from 'd3';
import { structureSelected } from './annotationDashboard/imageDataUtil';
import { renderStructureKnowns } from './annotationDashboard/commentBar';
import { addCommentButton, goBackButton } from './annotationDashboard/topbar';
import { commentSingleton } from './annotationDashboard/commentDataSingleton';
//import { config } from '@fortawesome/fontawesome-svg-core';

require('firebase/auth');
require('firebase/database');
const firebaseui = require('firebaseui');

export const fbConfig = [];

export function getDB(){
  return firebase.database();
}

export function getStorage(){
  return firebase.storage();
}

const uiConfig = {
  callbacks: {
    signInSuccessWithAuthResult(authResult) {
      const { user } = authResult;
      // const { credential } = authResult;
      // const { isNewUser } = authResult.additionalUserInfo;
      // const { providerId } = authResult.additionalUserInfo;
      // const { operationType } = authResult;

      // Do something with the returned AuthResult.
      // Return type determines whether we continue the redirect
      // automatically or whether we leave that to developer to handle.
      // return true;
      return loginSuccess(user);
    },

    signInFailure(error) {
      // Some unrecoverable error occurred during sign-in.
      // Return a promise when error handling is completed and FirebaseUI
      // will reset, clearing any UI. This commonly occurs for error code
      // 'firebaseui/anonymous-upgrade-merge-conflict' when merge conflict
      // occurs. Check below for more details on this.
      //return handleUIError(error);
      return window.alert(error);
    },
    uiShown() {
      // The widget is rendered.
      // Hide the loader.
      // document.getElementById('loader').style.display = 'none';
    },
  },
  signInFlow: 'popup',
  // signInSuccessUrl:"{{url_for('dashboard.index', user=currentUser)}}",
  signInOptions: [
    {
      provider: firebase.auth.GoogleAuthProvider.PROVIDER_ID,
      clientId: '632575175956-49a1hie4ab4gr69vak5onr307fg67bb0.apps.googleusercontent.com',
    },
    firebase.auth.EmailAuthProvider.PROVIDER_ID,
    {
      provider : firebase.auth.GithubAuthProvider.PROVIDER_ID,
      
      //REDIRECT FOR GITHUB ___  https://coronavirus-anno-two.firebaseapp.com/__/auth/handler
    },
    // firebaseui.auth.AnonymousAuthProvider.PROVIDER_ID,
  ],
  // Other config options...
}

export  async function loadConfig(){
  let config = await d3.json('../static/assets/firebase_data.json');
  fbConfig.push(config[0]);
  return config;
}

export async function loadFirebaseApp(){
  
  if (!firebase.apps.length) { 
    return firebase.initializeApp(fbConfig[0]); 
  }else{
    return firebase.apps[firebase.apps.length - 1];
  }
}

export function loadFirebaseUI(callbackType){
  if(firebaseui.auth.AuthUI.getInstance()) {
    const ui = firebaseui.auth.AuthUI.getInstance();
    console.log('ui exists', ui);
    if(callbackType === 'sign-in'){
      console.log('ui type??', callbackType)
      ui.start('#sign-in-wrap', uiConfig);
    }
  } else {

    const ui = new firebaseui.auth.AuthUI(firebase.auth());
    console.log('new ui', ui);
    if(callbackType === 'sign-in'){
      let text = d3.select('#sign-in-wrap').append('div').classed('warning-label', true);
      text.append('text').text('User accounts for this tool will not be used for any other purpose than identifying commentors.');
      ui.start('#sign-in-wrap', uiConfig);
      d3.select('#comment-wrap').style('margin-top', '300px');
    }
  }
}

export const userLoggedIn = {
  loggedInBool: false,
  uid: null,
  displayName: null,
  admin: false,
  email: null,
};

export function addUser(user) {
  if (user != null) {
    userLoggedIn.uid = user.uid;
    userLoggedIn.displayName = user.displayName;
    userLoggedIn.email = user.email;
    userLoggedIn.loggedInBool = true;
    userLoggedIn.admin = false;
  } else {
    userLoggedIn.uid = null;
    userLoggedIn.displayName = null;
    userLoggedIn.email = null;
    userLoggedIn.loggedInBool = false;
    userLoggedIn.admin = false;
  }
}

function loginSuccess(user) {
  addUser(user);
}

export function cancelLogin(){
 d3.select('#sign-in-wrap').selectAll('*').remove();
 document.getElementById('sign-in-wrap').removeAttribute('lang');
}

export function signOut(){
 loadFirebaseUI(null);
}

export function userLogin() {

  loadFirebaseApp();
  loadFirebaseUI('sign-in');
  goBackButton();

}



export async function checkUser(callbackArray, callbackArrayNoArgs) {
 
  loadFirebaseApp();

  firebase.auth().onAuthStateChanged(async (user) => {
  
    if (user) {
      d3.select('#sign-in-wrap').selectAll('*').remove();
      currentUser.push(user);
      addUser(user);
      d3.select('#sign-out').select('.log-label').text('Log out');
      d3.select('#sign-out').on('click', ()=> {
       
        firebase.auth().signOut();
        addUser(null);
        d3.select('#user').select('.user_name').remove();
        addCommentButton();
      });
      if(structureSelected.selected){
        d3.select('#comment-wrap').style('margin-top', '190px');
        renderStructureKnowns(d3.select('#right-sidebar').select('.top'));
        goBackButton();
      }else{
        d3.select('#comment-wrap').style('margin-top', '0px');
        addCommentButton();
      }
     
      callbackArray.forEach((fun) => {
        fun(user);
      });
      checkDatabase(callbackArrayNoArgs);
      
      // User is signed in.
    } else {
      console.log('NO USER', user);
      d3.select('#sign-out').select('.log-label').text('Log in');
      d3.select('#sign-out').on('click', ()=> {
        d3.select('#comment-wrap').style('margin-top', '170px');
        userLogin()});
     
      addCommentButton();
      checkDatabase(callbackArrayNoArgs);
      // No user is signed in.
    }
   
   // checkDatabase([addCommentButton, updateCommentSidebar])
  });
  return currentUser;
}

export function checkDatabase(callbackArray) {
  const ref = firebase.database().ref();
  ref.on('value', (snapshot) => {
  
    let commentOb = commentSingleton.getInstance();
    commentOb.updateData(snapshot.val());
   
    callbackArray.forEach((fun) => {
      fun(snapshot.val());
    });
  }, (error) => {
    console.log(`Error: ${error.code}`);
  });
}
