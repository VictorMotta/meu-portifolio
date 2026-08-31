Speeds up long actions — crafting, building, repairs, dismantling — without fast-forwarding the clock. The action gets faster; the world does not move.


## What it does, and why it exists


Dismantling a house, forging a batch of knives, reading through a stack of books: in Project Zomboid all of that costs hours of game time. In single player you have the fast-forward button, but it **spends the world** — hunger, darkness, food spoiling, batteries draining.


In multiplayer you do not even have that. Vanilla gives up on the first line of client/ISUI/SpeedControlsHandler.lua:


```lua
SpeedControlsHandler.onKeyPressed = function(key)
    if isClient() then
        return;
    end
```


Turbo Actions solves both cases the same way: it speeds up the **action** only and leaves the clock alone. No days burned.


## Why it exists


I made this mod because I could not find one that lets you tune **each kind of action separately**. What exists speeds everything up by the same single number.


I wanted what other games have offered for years. In ARK you set up a server and give taming one rate, XP another, harvesting another — each thing at its own pace, because not every part of a game needs to run at the same speed.


On my server I wanted fast crafting and everything else normal. You cannot: in multiplayer Project Zomboid has no fast-forward at all. Turbo Actions is the solution I landed on — one speed per action type, decided by whoever runs the world.


It is also my first Project Zomboid mod. If you find a bug, if something does not speed up when it should, or if you have an idea for an improvement, leave a comment on the Workshop page — and if you can, paste the part of your console.txt where `[TurboActions]` appears.


## Installing



      - Enable **Turbo Actions** on the Mods screen in the main menu.

      - Safe to add to an existing save, and safe to remove. Nothing is written into the world beyond the sandbox options.

      - On a server, the mod must be in the mod list of **both the server and the client**.




## Configuring for single player



      - Pick **New Game** and choose your map.

      - On the **Sandbox Options** screen, find **Turbo Actions** in the list on the left, below Animals.

      - Set the speed for each action type. They all start at **30x**.

      - Create the world. The speeds are stored in it.




Sandbox options belong to the world, so changing them after creation means a new world — or editing the save file by hand. If you like to experiment, keep a separate test world.


## Configuring for multiplayer



      - From the main menu, open the server configuration and pick the config you use (for example `servertest`).

      - In the tree on the left, under **Sandbox**, click **Turbo Actions**.

      - Set the speed for each type. The admin decides: players do not pick a speed, they only switch their own turbo on and off.

      - Save and start the server.




Want fast crafting but normal building? Set **Crafting speed** to 30x and **Building speed** to Off. Each type is independent.


Only building needs extra care in multiplayer — see the warning further down.


## The five options



| Option | Values | Default | Covers |
|---|---|---|---|
| Crafting speed | Off · 2x · 5x · 10x · 30x · 100x | 30x | workbench, forge, sewing, cooking, processing machines |
| Building speed | same | 30x | walls, floors, fences, multi-stage builds |
| Repair speed | same | 30x | weapons, clothing, generators, vehicle parts |
| Dismantling speed | same | 30x | taking furniture apart, demolishing builds |
| Speed for everything else | same | 30x | reading, digging, fishing, foraging — anything outside the categories above |



Setting a type to **Off** is the same as unticking it: that category runs at normal game speed.


## In game


A small indicator sits under the clock, top right. **Amber** means turbo is on; grey means off. Its right corner reads *up to 30x* or *off*, and the tooltip lists what this world allows.



      - [ switches turbo on and off.

      - \ hides and shows the indicator.

      - Clicking the **TURBO** button does the same as the key.

      - Drag the indicator anywhere — the position is remembered.




Keys are remappable under **Options › Keybindings**, section [Turbo Actions], and apply without restarting. Switching off works in multiplayer too: turning it off is never an advantage, so there is no reason to lock it.


Keybinding names stay in English even when the game is in another language. That is not an oversight: Project Zomboid draws a keybinding name exactly as the mod registered it, with no translation pass. A game limitation, not a mod one.



### The multiplayer building case


Building is the one action where the **server** owns the duration. In ISBuildAction, vanilla does this:


```lua
if isClient() then o.maxTime = -1 end    -- server decides

-- and later:
local duration = getActionDuration(self.transactionId)
if duration > 0 then
    self.maxTime = duration
    self.action:setTime(self.maxTime)    -- bypasses the mod
end
```


The mod forces the speed-up from the client side, which works — but the client then finishes before the server confirms. A piece may appear and vanish, or the action may be rejected. If that happens on your server, set **Building speed** to **Off**: the other four keep working normally.


There is deliberately no separate switch for this behaviour. Sandbox options belong to the world: a server that sets building above Off has already made that choice for itself, and your single-player world is never affected by a server's choice. A second option would only add confusion and, worse, make the building option lie in multiplayer whenever it was left off.


Single player carries no risk at all: there the duration is created locally and goes through the normal path. Crafting, repairs and dismantling have no such problem in either mode.




## Where it applies



| Action | Single player | Multiplayer |
|---|---|---|
| Crafting | yes | yes |
| Repairs | yes | yes |
| Dismantling and demolishing | yes | yes |
| Reading, digging, fishing, foraging | yes | yes |
| Building | yes | yes, with the caveat above |




## How it works inside


The mod overrides ISBaseTimedAction:adjustMaxTime, which 42.20.4 calls from `create()` for every timed action. There is exactly one definition of that method in the whole of vanilla media/lua — no subclass overrides it — so a single point reaches the entire game.


To know *which* action is running, the mod reads `action.Type`. Every `ISBaseObject:derive(name)` writes that field, so the category filter is exact rather than guessed from a file name or a heuristic.


Written and tested against the Lua of 42.20.4, not ported from a Build 41 tutorial.

    Turbo Actions 0.9.0 · Victor Motta · Português and English
