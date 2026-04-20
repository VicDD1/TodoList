import { mount } from 'svelte';
import App from './App.svelte';

const target = document.getElementById('app');

if (target) {
  mount(App, {
    target: target,
  });
} else {
  console.error("L'élément avec l'id 'app' est introuvable dans index.html");
}