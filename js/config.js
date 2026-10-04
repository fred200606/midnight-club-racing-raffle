/* Constants, sample entrants and retro car body shapes. */
'use strict';

const DISPLAY = 'Bungee, "Arial Black", Impact, sans-serif';
const BODY = '"Chakra Petch", "Segoe UI", system-ui, sans-serif';
const MAX = 120, TILE = 400, ACC = 1.2, TAU = 0.9, M_PER_S = 32;
const PLACE = ['#ffc93c', '#c9d1dc', '#d38a4f'];
const TAGS = 10; // how many leaders get a name tag on the track

const SAMPLE = `Maria Santos
James Okafor
Aiko Tanaka
Paolo Dizon
Priya Nair
Tom Becker
Chloe Martin
Kwame Mensah
Sofia Rossi
Daniel Kim
Andrea Reyes
Ethan Walker
Mei Lin
Carlos Fernández
Hannah Schmidt
Arjun Patel
Grace Okoro
Mark Villanueva
Isabel Cruz
Liam O'Connor
Yuki Mori
Ava Thompson
Mateo García
Zara Ahmed
Bea Santiago
Leila Haddad
Jonas Weber
Nina Petrova
Samuel Adeyemi
Emma Dubois
Ravi Kumar
Lucia Romano
Joshua Mendoza
Amara Diallo
Felix Novak
Rosa Delgado
Kenji Watanabe
Ella Fischer
Omar Farouk
Kristine Bautista
Diego Morales
Hana Park
Lucas Silva
Aisha Bello
Max Hoffmann
Clara Moreau
Tariq Hassan
Lily Evans
Miguel Aquino
Sara Lindqvist
Victor Lam
Nadia Rahman
Paolo Bianchi
Julia Nowak
Kofi Asante
Elena Popescu
Ryan Murphy
Ines Costa
Hugo Lefevre
Anya Ivanova
Marcus Reid
Camila Torres
Theo Andersen
Joy Mabaso`.split('\n');

/* ---------- retro car bodies (side view, nose to the right; units: 74 x 28) ---------- */
const UW = 74, UH = 28, NOSE = 71.5, WHEEL_Y = 20.6;
const COLORS = ['#e63946','#ff7a1a','#ffc93c','#9be15d','#1fb5a8','#3ec6ff','#2f5bea','#8b5cf6','#ff3d8b','#ff8fc2','#f2f2f2','#9aa3b2','#2a2c38','#f3e3b5','#7ee0c3','#a0603a'];
const SHAPES = [
  { // muscle coupe
    body: [['M',1,21.5],['L',1,14],['Q',1.5,11.6,6,11.3],['L',22,10.6],['L',28,4.8],['L',44,4.6],['L',51,10.4],['L',66,11.2],['Q',71,11.8,71.5,14.5],['L',71.5,19.5],['Q',71,21.5,68,21.5],['Z']],
    glass: [[[26.5,10.4],[30,6.2],[36.5,6.1],[36.5,10.4]], [[38,10.4],[38,6.1],[43.5,6.1],[48.5,10.4]]],
    wheels: [14, 58], r: 5.2, num: [37, 15.8], head: [69.6,13,2,2.4], tail: [1,13.6,1.6,2.6], stripe: 16.4 },
  { // 80s wedge
    body: [['M',1,21.5],['L',1.5,13],['L',14,11.2],['L',27,10.2],['L',34,5.4],['L',45,5.2],['L',57,11],['L',71.5,15.6],['L',71.5,19.8],['Q',71,21.5,68,21.5],['Z']],
    glass: [[[30.5,10.2],[35,6.4],[39.5,6.3],[39.5,10.3]], [[41,10.3],[41,6.3],[44.5,6.2],[53,10.6]]],
    wheels: [15, 58], r: 5.4, num: [36, 16], head: [67.5,15,3.4,1.2], tail: [1.2,13.4,1.4,3], stripe: 17 },
  { // hot hatch
    body: [['M',1,21.5],['L',1,12],['Q',1.2,6.2,4,5.6],['L',30,5],['L',40,10.4],['L',64,11.2],['Q',71,11.6,71.5,14],['L',71.5,19.8],['Q',71,21.5,68,21.5],['Z']],
    glass: [[[4.8,10.2],[6,6.6],[16,6.4],[16,10.2]], [[17.5,10.2],[17.5,6.4],[29,6.2],[36.5,10.3]]],
    wheels: [14, 57], r: 5, num: [27, 16], head: [69.6,12.8,1.9,2.4], tail: [1,11.5,1.6,3], stripe: 16.6 },
];
SHAPES.forEach(s => { s.g = WHEEL_Y + s.r; });
