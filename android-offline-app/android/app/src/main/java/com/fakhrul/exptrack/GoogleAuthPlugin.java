package com.fakhrul.exptrack;

import android.content.MutableContextWrapper;
import androidx.core.content.ContextCompat;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.ClearCredentialStateRequest;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.ClearCredentialException;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "GoogleAuth")
public class GoogleAuthPlugin extends Plugin {
    @PluginMethod public void signIn(PluginCall call) {
        String clientId = call.getString("clientId");
        String nonce = call.getString("nonce");
        if (clientId == null || !clientId.endsWith(".apps.googleusercontent.com") || nonce == null || nonce.length() < 32) {
            call.reject("Google sign-in is not configured."); return;
        }
        getActivity().runOnUiThread(() -> {
            try {
                GetSignInWithGoogleOption option = new GetSignInWithGoogleOption.Builder(clientId).setNonce(nonce).build();
                GetCredentialRequest request = new GetCredentialRequest.Builder().addCredentialOption(option).build();
                CredentialManager.create(getContext()).getCredentialAsync(
                    new MutableContextWrapper(getActivity()), request, null, ContextCompat.getMainExecutor(getContext()),
                    new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                        @Override public void onResult(GetCredentialResponse result) {
                            try {
                                if (!(result.getCredential() instanceof CustomCredential)) throw new IllegalArgumentException();
                                CustomCredential credential = (CustomCredential) result.getCredential();
                                if (!GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(credential.getType())) throw new IllegalArgumentException();
                                String token = GoogleIdTokenCredential.createFrom(credential.getData()).getIdToken();
                                JSObject response = new JSObject(); response.put("idToken", token); call.resolve(response);
                            } catch (Exception e) { call.reject("Google returned an invalid sign-in response. Please try again."); }
                        }
                        @Override public void onError(GetCredentialException error) {
                            if (error instanceof GetCredentialCancellationException) call.reject("Google sign-in was cancelled.", "CANCELLED");
                            else call.reject("Could not sign in with Google. Check your internet connection and Google Play services, then try again.");
                        }
                    }
                );
            } catch (Exception e) { call.reject("Could not open Google sign-in. Please try again."); }
        });
    }

    @PluginMethod public void signOut(PluginCall call) {
        CredentialManager.create(getContext()).clearCredentialStateAsync(new ClearCredentialStateRequest(), null,
            ContextCompat.getMainExecutor(getContext()), new CredentialManagerCallback<Void, ClearCredentialException>() {
                @Override public void onResult(Void result) { call.resolve(); }
                @Override public void onError(ClearCredentialException error) { call.resolve(); }
            });
    }
}
