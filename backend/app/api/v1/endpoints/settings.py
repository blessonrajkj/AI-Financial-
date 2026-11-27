from fastapi import APIRouter

# Dead duplicate routes (/settings/subscriptions and /settings/investments)
# have been consolidated to canonical /subscriptions and /investments endpoints.
router = APIRouter()
