import firebase from 'firebase/app';
import 'firebase/database';
import 'firebase/functions';

const config = {
  apiKey: "AIzaSyCATCUYWleLEp6vf45XbAk0Uu_2gK_zqig",
  authDomain: "glomok-simple.firebaseapp.com",
  databaseURL: "https://glomok-simple.firebaseio.com",
  projectId: "glomok-simple",
  storageBucket: "glomok-simple.appspot.com",
  messagingSenderId: "488317740124"
};

export const firebaseApp = firebase.initializeApp(config);
