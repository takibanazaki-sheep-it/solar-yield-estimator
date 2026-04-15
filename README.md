# Solar Yield Estimator v2

This version supports **multiple roof faces**, which is the minimum needed for a real east-west domestic system.

## New in v2

- Multiple roof faces
- Each roof face has its own:
  - panel count
  - panel wattage
  - tilt
  - azimuth
  - optional loss override
- The app fetches irradiance per roof face, then combines them into:
  - total hourly yield
  - total daily yield
  - per-roof forecast totals

## Good fit for

- east / west split roofs
- south + garage extension
- mixed tilt arrays
- future expansion where one roof plane differs from another

## Still missing

This is now usable, but still not "production truth". It does not yet model:

- chimneys / trees / neighbour shading
- panel-level optimiser differences
- inverter clipping in detail
- battery charge / discharge
- export cap
- separate inverter strings with different efficiency curves
- satellite roof tracing

## Suggested real-world setup

For a typical house:
- add one card for east roof
- add one card for west roof
- split the real panel count between them
- keep panel wattage the same unless you actually have mixed panel models

## GitHub Pages

Upload the files to a repo and publish it from Pages the same way as the tarot app.
