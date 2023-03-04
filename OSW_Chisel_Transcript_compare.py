import requests
import regex
import re
from bs4 import BeautifulSoup
import pandas as pd
import sys
from functional import seq

def get_wiki(npc: str, page: str) -> pd.Series:
    response = requests.post(f'https://oldschool.runescape.wiki/w/Transcript:{page}', params={'action': 'raw'})
    lines = response.text.split('\n')

    npcPattern = regex.compile(fr"\**\s?'''{npc}:'''\s?(.*)")
    sicPattern = re.compile(r"{{sic\|?[^}]*}}")
    colourPattern = re.compile(r"{{[Cc]olou?r\|#(?:[0-9a-fA-F]{3}){1,2}\|(.[a-zA-Z]+)}}")

    for i, line in enumerate(lines):
        if "{{overhead|" in line:
            lines[i] = ""
        lines[i] = colourPattern.sub(r'\1', lines[i])
        lines[i] = re.sub(sicPattern, "", lines[i])
        lines[i] = lines[i].replace("[player name]", "%USERNAME%")
        

    wiki = (
        pd.Series(seq(lines)
            .map(lambda x: npcPattern.match(x))
            .filter(lambda x: x is not None)
            .map(lambda x: x.groups()[0],)
         ,dtype='object')
        .reset_index()
        .rename(columns={
            0: 'line', 
            'index': 'wiki'
        })
    )

    return wiki

def get_chisel(npc: str) -> pd.Series:
    resp = requests.get(f"https://chisel.weirdgloop.org/dialogue/npcs/{npc}")
    soup = BeautifulSoup(resp.text, features='lxml')
    chisel = (pd.read_html(resp.text)[0]
        .reset_index()
        .rename(columns={
            'message': 'line', 
            'index': 'chisel'
        })
    )
    return chisel

npc = ""
pages = []

wiki = pd.Series(dtype='object')

exitInput = ""

while exitInput != "q":
    if exitInput != "same":
        wiki = pd.Series(dtype='object')
        npc = input("Enter NPC name:")
        print("Enter nothing into the input when done")
        while(True):
            page = input("Enter page name:")
            if(page == ""):
                break
            else:
                pages.append(page)

    if not pages:
        break
    else:
        for page in pages:
            if(wiki.empty):
                wiki = get_wiki(npc, page)
            else:
                wiki = pd.concat([wiki, get_wiki(npc, page)])
        
    chisel = get_chisel(npc)     

    print(wiki
        .merge(chisel, on='line', how='outer')
        .assign(
            line=lambda x: x['line'].fillna(''),
            wiki=lambda x: x['wiki'].notna(), 
            chisel=lambda x: x['chisel'].notna(),
            count=lambda x: x['count'].fillna(0).astype(int)
        )
        .query('not (wiki and chisel)')
        [['line', 'wiki', 'chisel', 'count']]
        .sort_values('count', ascending=False)
        .to_string()
    )
    exitInput = input("Enter q to exit or same to use repeat the previous:")

