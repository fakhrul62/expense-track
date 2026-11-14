import assert from 'node:assert/strict';
import ts from 'typescript';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const exports={};vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/app-updater.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:()=>({registerPlugin:()=>({})})});
const {updateAvailable}=exports,base={currentVersion:'1.0.0',currentCode:10,available:true,ready:false,canInstall:true};
assert(updateAvailable({...base,latestCode:11}));
for(const state of [null,{...base,latestCode:10},{...base,latestCode:9},{...base,latestCode:11,available:false},{...base,latestCode:undefined},{...base,latestCode:NaN},{...base,latestCode:10.5},{...base,latestCode:'11'}])assert.equal(updateAvailable(state),false);
console.log('PASS: only a confirmed strictly newer integer version shows the update indicator; current/older/unknown/malformed states stay clear');
