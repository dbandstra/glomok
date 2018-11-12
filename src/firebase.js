import firebase from 'firebase/app';
import 'firebase/database';

const config = {
  apiKey: 'AIzaSyA-1wxUEyo_-o5VjlM-kzQgnymtYGJPS_U',
  authDomain: 'glomok-a6848.firebaseapp.com',
  databaseURL: 'https://glomok-a6848.firebaseio.com',
  projectId: 'glomok-a6848',
  storageBucket: 'glomok-a6848.appspot.com',
  messagingSenderId: '952832220581',
};

export const firebaseApp = firebase.initializeApp(config);
