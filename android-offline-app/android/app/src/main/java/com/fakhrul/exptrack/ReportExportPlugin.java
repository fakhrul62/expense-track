package com.fakhrul.exptrack;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import android.print.*;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "ReportExport")
public class ReportExportPlugin extends Plugin {
    @PluginMethod public void save(PluginCall call) {
        String text=call.getString("text"), filename=call.getString("filename");
        if(text==null || text.length()>5000000 || filename==null || !filename.matches("EXPTRACK-[0-9-]+-to-[0-9-]+\\.csv")){call.reject("Report is too large or invalid.");return;}
        Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("text/csv").putExtra(Intent.EXTRA_TITLE,filename);
        getActivity().runOnUiThread(()->{try { startActivityForResult(call,intent,"saved"); } catch(Exception e){call.reject("Could not open the file picker.",e);}});
    }
    @ActivityCallback private void saved(PluginCall call, ActivityResult result) {
        if(call==null)return;
        if(result.getResultCode()!=Activity.RESULT_OK || result.getData()==null || result.getData().getData()==null){JSObject response=new JSObject();response.put("cancelled",true);call.resolve(response);return;}
        getBridge().execute(()->{
            try(OutputStream stream=getContext().getContentResolver().openOutputStream(result.getData().getData(),"wt")){
                if(stream==null)throw new java.io.IOException("No destination");
                stream.write(call.getString("text","").getBytes(StandardCharsets.UTF_8));call.resolve();
            }catch(Exception e){call.reject("Could not save the report. Choose another folder or check free storage.",e);}
        });
    }
    @PluginMethod public void print(PluginCall call) {
        String html=call.getString("html");
        if(html==null || html.length()>5000000){call.reject("Report is too large to print.");return;}
        getActivity().runOnUiThread(()->{
            WebView view=new WebView(getActivity());
            view.getSettings().setJavaScriptEnabled(false);
            view.getSettings().setAllowFileAccess(false);
            view.getSettings().setBlockNetworkLoads(true);
            view.setWebViewClient(new WebViewClient(){
                private boolean opened=false;
                @Override public void onPageFinished(WebView web,String url){
                    if(opened)return;opened=true;
                    try{
                        PrintDocumentAdapter adapter=web.createPrintDocumentAdapter("EXPTRACK Report");
                        PrintDocumentAdapter cleanup=new PrintDocumentAdapter(){
                            @Override public void onStart(){adapter.onStart();}
                            @Override public void onLayout(PrintAttributes oldAttrs,PrintAttributes newAttrs,CancellationSignal signal,LayoutResultCallback callback,Bundle extras){adapter.onLayout(oldAttrs,newAttrs,signal,callback,extras);}
                            @Override public void onWrite(PageRange[] pages,ParcelFileDescriptor dest,CancellationSignal signal,WriteResultCallback callback){adapter.onWrite(pages,dest,signal,callback);}
                            @Override public void onFinish(){adapter.onFinish();web.destroy();}
                        };
                        PrintManager manager=(PrintManager)getActivity().getSystemService(Context.PRINT_SERVICE);
                        manager.print("EXPTRACK Report",cleanup,new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).build());call.resolve();
                    }catch(Exception e){web.destroy();call.reject("Could not open print options.",e);}
                }
            });
            view.loadDataWithBaseURL(null,html,"text/html","UTF-8",null);
        });
    }
}
