// ==UserScript==
// @name        Chisel OSW Unique Dialogue
// @namespace   http://chisel.weirdgloop.org
// @match       https://chisel.weirdgloop.org/dialogue/npcs/*
// @grant       none
// @version     1.0
// @author      Fjara
// @description Sort Chisel and OSW transcript pages into list of uniques
// ==/UserScript==

const linebreak = document.createElement('br');
const npcName = document.URL.substring(document.URL.lastIndexOf("/") + 1);

// Should I make the unique chisel table have count and links?
function generateTable(page, list){
  let table = document.createElement('table');
  table.setAttribute('name', page + "Table");
  for(let i = 0; i < list.length; i++){
    const tr = table.insertRow();
    const td = tr.insertCell();
    td.innerText = list[i];
  }
  document.getElementById(page + "Header").after(table);
}

function removeOldTables(transcriptPages){
  for(let i = 0; i < transcriptPages.length; i++){
    if(document.contains(document.getElementById(transcriptPages[i] + "Table"))) {
      document.getElementById(transcriptPages[i] + "Table").remove();
    }
  }
}

function getChiselDialgue() {
  let ret = [];
  let rows = document.getElementById("OriginalChiselTable").rows;
  for(let i = 1; i < rows.length; i++){
    ret.push(rows[i].cells[0].innerText);
  }
  return ret;
}

function filterLists(lists){
  let numberRange = document.getElementById("numberRangeCheckbox").value;
  let numberReplace = document.getElementById("numberReplaceCheckbox").value;
  let ret = new Array(lists.length);
  for(let i = 0, max = lists.length; i < max; i++){
    let lateJoiners = [];
    for(let j = 0, maxTwo = lists[i].length; j < maxTwo; j++){
      if(lists[i][j].indexOf("'''" + npcName + ":'''") == -1){
        lists[i][j] = ""
      }
      if(lists[i][j].indexOf("'''" + npcName + ":'''") >= 0){
        let npcDialogueString = new RegExp("\*+\s?'''" + npcName + "''':\s?");
        lists[i][j] = lists[i][j].replace(npcDialogueString, "");
      }
      if(lists[i][j].indexOf("{{overhead|") >= 0){
        lists[i][j] = "";
      }
      lists[i][j] = lists[i][j].replace('[player name]', '%USERNAME%');
      const sicRegex = /\{\{sic\|?[^\}]*\}\}/i;
      lists[i][j] = lists[i][j].replace(sicRegex, '');
      lists[i][j] = lists[i][j].trim();
      const numberRangeRegex = /\[(\d+)\s?[–−‐]\s?(\d+)\]/;
      let numRanges = numberRangeRegex.exec(lists[i][j]);
      if(numRanges){
        for(let k = numRanges[1]; k <= numRanges[2]; k++){
          lateJoiners.push(lists[i][j].replace(numberRangeRegex, k));
        }
        lists[i][j] = "";
      }
      if(numberReplace){
        lists[i][j] = lists[i][j].replace(/\d+/, "%NUMBER%");
      }
    }
    lists[i] = lists[i].concat(lateJoiners);
  }
  return lists;
}

async function getResponseLines(url){
  let response = await fetch(url, {method: 'POST'});
  let lines = await response.text();
  return lines.toString().split(/\r?\n|\r|\n/g);
}

async function getPageText(transcriptPages){
  let ret = [];
  for(let i = 0; i < transcriptPages.length; i++){
    try{
      ret.push(await getResponseLines('https://oldschool.runescape.wiki/w/Transcript:' + transcriptPages[i] + '?action=raw'));
    } catch(e) {
      console.log(e);
    }
  }
  return ret;
}

function getInputList(){
  let ret = [];
  let inputs = document.getElementsByName("textinput");
  for(let i = 0, max = inputs.length; i < max; i++){
    if(inputs[i].value && inputs[i].value != ""){
      ret.push(inputs[i].value);
    }
  }
  return ret;
}

function addNewTextInput(){
  let body = document.getElementsByTagName("body")[0];
  let originalTable = document.getElementsByTagName("table")[0];
  let textInput = document.createElement("input");
  textInput.setAttribute('name', "textinput");
  textInput.type = "text";

  body.insertBefore(linebreak.cloneNode(true), OriginalChiselTable);
  body.insertBefore(textInput, OriginalChiselTable);
}

//make thewiki tables link to the pages?
function createSectionHeaders(transcriptPages) {
  let body = document.getElementsByTagName("body")[0];
  if (!document.getElementById("UniqueChiselDialogueHeader")) {
    let chiselHeader = document.createElement("h2");
    chiselHeader.innerHTML = "Unique Chisel Dialogue";
    chiselHeader.setAttribute('id', "UniqueChiselDialogueHeader");
    body.appendChild(chiselHeader);
  }

  if (!document.getElementById("UniqueWikiDialogueHeader")) {
    let wikiHeader = document.createElement("h2");
    wikiHeader.innerHTML = "Unique Wiki Dialogue";
    wikiHeader.setAttribute('id', "UniqueWikiDialogueHeader");
    body.appendChild(wikiHeader);
  }

  transcriptPages.forEach(function(pageName) {
    if (!document.getElementById(pageName + "Header")) {
      let wikiTranscriptPageHeader = document.createElement("h3");
      wikiTranscriptPageHeader.innerHTML = pageName;
      wikiTranscriptPageHeader.setAttribute('id', pageName + "Header");
      body.appendChild(wikiTranscriptPageHeader);
    }
  });
}

function main() {
  'use strict';

  console.log('running Chisel OSW Unique Dialogue');

  // Do I ever need to request the NPC name to be input?

  let body = document.getElementsByTagName("body")[0];
  let originalTable = document.getElementsByTagName("table")[0];
  originalTable.setAttribute('id', 'OriginalChiselTable');

  let originalHeader = document.createElement("h2");
  originalHeader.innerHTML = "Original Chisel Dialogue";
  originalHeader.setAttribute('id', "OriginalChiselDialogueHeader");
  body.insertBefore(originalHeader, originalTable);

  let runButton = document.createElement("button");
  runButton.type = "text";
  runButton.innerHTML = "Run Uniques";
  runButton.addEventListener("click", async function() {
    let pageList = getInputList();
    createSectionHeaders(pageList);
    let dialogueLists = await getPageText(pageList);
    dialogueLists = filterLists(dialogueLists);
    console.log(dialogueLists);//
    removeOldTables(pageList);
    removeOldTables(['UniqueChisel']);
    let chiselList = getChiselDialgue();
    for(let i = 0; i < dialogueLists.length; i++){
      dialogueLists[i] = dialogueLists[i].filter((value, index, array) => array.indexOf(value) === index);
      generateTable(pageList[i], dialogueLists[i].filter((o) => chiselList.indexOf(o) === -1));
    }
    let wikiDialogue = dialogueLists.flat(1);
    wikiDialogue = wikiDialogue.filter((value, index, array) => array.indexOf(value) === index);
    //console.log(wikiDialogue);
    //console.log(chiselList);
    //console.log(chiselList.filter(n => !wikiDialogue.includes(n)));
    generateTable('UniqueChiselDialogue', chiselList.filter(n => !wikiDialogue.includes(n)));//this isnt joining right
  });
  body.insertBefore(runButton, OriginalChiselTable);

  let numberRangeCheckbox = document.createElement("input");
  numberRangeCheckbox.type = "checkbox";
  numberRangeCheckbox.setAttribute('id', "numberRangeCheckbox");
  numberRangeCheckbox.setAttribute('name', "checkbox");
  body.insertBefore(linebreak.cloneNode(true), OriginalChiselTable);
  body.insertBefore(numberRangeCheckbox, OriginalChiselTable);
  let numberRangeLabel = document.createElement("label");
  numberRangeLabel.setAttribute('for', "numberRangeCheckbox");
  numberRangeLabel.textContent = 'Append number range variations';
  body.insertBefore(numberRangeLabel, OriginalChiselTable);

  let numberReplaceCheckbox = document.createElement("input");
  numberReplaceCheckbox.type = "checkbox";
  numberReplaceCheckbox.setAttribute('id', "numberReplaceCheckbox");
  numberReplaceCheckbox.setAttribute('name', "checkbox");
  body.insertBefore(linebreak.cloneNode(true), OriginalChiselTable);
  body.insertBefore(numberReplaceCheckbox, OriginalChiselTable);
  let numberReplaceLabel = document.createElement("label");
  numberReplaceLabel.setAttribute('for', "numberReplaceCheckbox");
  numberReplaceLabel.textContent = 'Replace numbers with %NUMBER%';
  body.insertBefore(numberReplaceLabel, OriginalChiselTable);

  let addInputButton = document.createElement("button");
  addInputButton.type = "text";
  addInputButton.innerHTML = "+input";
  addInputButton.addEventListener ("click", function() {
    addNewTextInput();
  });
  body.insertBefore(linebreak.cloneNode(true), OriginalChiselTable);
  body.insertBefore(addInputButton, OriginalChiselTable);
  addNewTextInput();
}

main();
