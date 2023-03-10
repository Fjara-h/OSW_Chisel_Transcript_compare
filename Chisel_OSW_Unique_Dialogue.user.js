// ==UserScript==
// @name        Chisel OSW Unique Dialogue
// @namespace   http://chisel.weirdgloop.org
// @match       https://chisel.weirdgloop.org/dialogue/npcs/*
// @grant       GM_addStyle
// @version     1.0
// @author      Fjara
// @description Sort Chisel and OSW transcript pages into list of uniques
// ==/UserScript==

//TODO Unique Chisel dialogue should also link to the related pages.
///

const linebreak = document.createElement('br');
const npcName = decodeURI(document.URL).substring(document.URL.lastIndexOf("/") + 1).replace("_", " ");

function generateTable(page, list){
  let table = document.createElement('table');
  table.setAttribute('id', page + "Table");
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
    document.getElementById('OriginalChiselTable').getElementsByTagName('tr')[8].getElementsByTagName('td')[0].innerText;
    ret.push(rows[i].cells[0].innerText);
  }
  return ret;
}

// Deletes or modifies lines that aren't related or in chisel
function filterLists(lists){
  let numberRange = document.getElementById("numberRangeCheckbox").checked;
  let numberReplace = document.getElementById("numberReplaceCheckbox").checked;
  for(let i = 0; i < lists.length; i++){
    let lateJoiners = [];
    console.log(lists);
    for(let j = 0; j < lists[i].length; j++){
      // Only use lines starting with the npc name that is speaking
      if(lists[i][j].includes("'''" + npcName + ":'''")){
        let npcDialogueString = new RegExp("\\*+ ?'''" + npcName + ":''' ?");
        lists[i][j] = lists[i][j].replace(npcDialogueString, "");
      } else {
        lists[i][j] = ""
      }
      // Overheads arent in chisel
      if(lists[i][j].includes("{{overhead|")){
        lists[i][j] = "";
      }
      // Colour template is not in chisel, but the text itself is
      if(/\{\{[Cc]olou?r\|/.test(lists[i][j])){//Need to handle background colours in the template if they happen
        lists[i][j] = lists[i][j].replace(/\{\{[Cc]olou?r\|[^\|]*\|([^\}]+)\}\}/, "$1");
      }
      lists[i][j] = lists[i][j].replace('[player name]', '%USERNAME%');
      const sicRegex = /\{\{sic\|?[^\}]*\}\}/i;
      // Sic template is wiki only
      lists[i][j] = lists[i][j].replace(sicRegex, '');
      lists[i][j] = lists[i][j].trim();
      // Some numbers have ranges (See Rantz) on chisel usually input on the wiki as [500-549]
      let numRanges = lists[i][j].match(/\[[\d,]+ ?[-–−‐] ?[\d,]+\]/);
      if(numRanges !== null && numberRange){
        for(let k = 0; k < numRanges.length; k++){
          nums = numRanges[k].match(/[\d,]+/g);
          for(let m = Number(nums[0].replace(",", "")); m <= Number(nums[1].replace(",", "")); m++){
            lateJoiners.push(lists[i][j].replace(numRanges[k], m));
          }
        }
        lists[i][j] = "";
      }
      // Sometimes other numbers are entirely replaced with %NUMBER% on chisel.
      /// If numberRange isn't active, replace ranges with %NUMBER% as well.
      if(numberReplace){
        if(!numberRange){
          lists[i][j] = lists[i][j].replace(/\[[\d,]+ ?[-–−‐] ?[\d,]+\]/, "%NUMBER%");
        } else {
          lists[i][j] = lists[i][j].replace(/\d+/g, "%NUMBER%");
        }
      }
    }
    lists[i] = lists[i].concat(lateJoiners);
  }
  return lists;
}

// Get the raw transcript dialogue on the wiki and return it as an array, each element is a newline
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

// Grab text from the input boxes to use as transcript page names
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

function addNewTextInput(text){
  let body = document.getElementsByTagName("body")[0];
  let originalTable = document.getElementsByTagName("table")[0];
  let textInput = document.createElement("input");
  textInput.setAttribute('name', "textinput");
  textInput.type = "text";
  textInput.value = text;

  body.insertBefore(linebreak.cloneNode(true), OriginalChiselTable);
  body.insertBefore(textInput, OriginalChiselTable);
}


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
      let wikiTranscriptPageLink = "https://oldschool.runescape.wiki/w/Transcript:" + pageName
      let link = document.createElement('a');
      link.appendChild(document.createTextNode(pageName));
      link.title = pageName;
      link.href = wikiTranscriptPageLink;
      link.target = "_blank";
      let wikiTranscriptPageHeader = document.createElement("h3");
      wikiTranscriptPageHeader.appendChild(link);
      wikiTranscriptPageHeader.setAttribute('id', pageName + "Header");
      body.appendChild(wikiTranscriptPageHeader);
    }
  });
}

function main() {
  'use strict';

  console.log('running Chisel OSW Unique Dialogue');

  // This stops lines from messing with duplicate white spaces.
  GM_addStyle("tr { white-space: pre; }");
  // Do I ever need to request the NPC name to be input?

  let body = document.getElementsByTagName("body")[0];
  let originalTable = document.getElementsByTagName("table")[0];
  originalTable.setAttribute('id', 'OriginalChiselTable');

  let originalHeader = document.createElement("h2");
  originalHeader.innerHTML = "Original Chisel Dialogue for " + npcName;
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
    removeOldTables(['UniqueChiselDialogue']);
    let chiselList = getChiselDialgue();
    for(let i = 0; i < dialogueLists.length; i++){
      dialogueLists[i] = dialogueLists[i].filter((value, index, array) => array.indexOf(value) === index);
      // Display dialogue on the wiki that doesn't exist on chisel
      generateTable(pageList[i], dialogueLists[i].filter((o) => chiselList.indexOf(o) === -1));
    }
    let wikiDialogue = dialogueLists.flat(1);
    wikiDialogue = wikiDialogue.filter((value, index, array) => array.indexOf(value) === index);
    // Display dialouge on chisel that doesn't exist on the wiki
    generateTable('UniqueChiselDialogue', chiselList.filter(n => !wikiDialogue.includes(n)));// Is this filtering correctly
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
    addNewTextInput("");
  });
  body.insertBefore(linebreak.cloneNode(true), OriginalChiselTable);
  body.insertBefore(addInputButton, OriginalChiselTable);
  addNewTextInput(npcName);
}

main();
