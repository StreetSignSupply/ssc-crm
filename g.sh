#!/bin/bash
# One-time keyless Google sign-in for the CRM worker (GitHub Actions -> Firestore). Safe to run twice.
PROJECT=ssc-crm-a7224
REPO=StreetSignSupply/ssc-crm
SA=firebase-adminsdk-fbsvc@$PROJECT.iam.gserviceaccount.com
gcloud config set project $PROJECT >/dev/null 2>&1
PNUM=$(gcloud projects describe $PROJECT --format='value(projectNumber)')
echo "Setting up... (about a minute)"
gcloud services enable iamcredentials.googleapis.com sts.googleapis.com
gcloud iam workload-identity-pools describe github --location=global >/dev/null 2>&1 || \
  gcloud iam workload-identity-pools create github --location=global --display-name="GitHub"
gcloud iam workload-identity-pools providers describe ssc-crm --location=global --workload-identity-pool=github >/dev/null 2>&1 || \
  gcloud iam workload-identity-pools providers create-oidc ssc-crm --location=global --workload-identity-pool=github \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
    --attribute-condition="assertion.repository=='$REPO'"
gcloud iam service-accounts add-iam-policy-binding $SA --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$PNUM/locations/global/workloadIdentityPools/github/attribute.repository/$REPO" >/dev/null
echo
echo "DONE: projects/$PNUM/locations/global/workloadIdentityPools/github/providers/ssc-crm"
echo "Send Claude a screenshot of the line above."
