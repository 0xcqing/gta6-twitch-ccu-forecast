# GTA VI Twitch CCU Forecast

A comparable-ratio forecaster for launch-day Twitch concurrency. Each case is anchored on its first-hour viewer print; for every later hour, the program pools log ratios from past launches at the same elapsed hour and reads empirical quantiles from them. A spread constant widens or narrows the band around the empirical median, a shift constant moves the center, and outputs are clamped to finite, non-decreasing values. When an hour has too few comparable observations, it uses the persistence baseline instead.

[![make.fun · gta6-twitch-ccu-forecast-01](https://make.fun/badge/gta6-twitch-ccu-forecast-01.svg)](https://make.fun/bounty/gta6-twitch-ccu-forecast-01)
[![rank](https://make.fun/badge/gta6-twitch-ccu-forecast-01/0xcqing/gta6-twitch-ccu-forecast/rank.svg)](https://make.fun/bounty/gta6-twitch-ccu-forecast-01/leaderboard)
[![reward](https://make.fun/badge/gta6-twitch-ccu-forecast-01/0xcqing/gta6-twitch-ccu-forecast/reward.svg)](https://make.fun/bounty/gta6-twitch-ccu-forecast-01)

## Run

```sh
MAKEFUN_INPUT_DIR=input MAKEFUN_OUTPUT_DIR=out node main.ts
```
