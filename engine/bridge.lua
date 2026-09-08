-- Astropowder interface bridge, GPL-3.0. The simulation itself is unmodified.
local function astroStartup()
local function json(v)
  local t=type(v)
  if t=='nil' then return 'null' end
  if t=='boolean' then return v and 'true' or 'false' end
  if t=='number' then if v~=v or v==math.huge or v==-math.huge then return 'null' end return tostring(v) end
  if t=='string' then return '"'..v:gsub('[%z\1-\31\\"]',function(c) return string.format('\\u%04x',string.byte(c)) end)..'"' end
  if t=='table' then
    local a={} local n=0 local array=true
    for k,_ in pairs(v) do n=n+1 if type(k)~='number' then array=false end end
    if array and n>0 then for i=1,n do a[#a+1]=json(v[i]) end return '['..table.concat(a,',')..']' end
    for k,val in pairs(v) do a[#a+1]=json(tostring(k))..':'..json(val) end
    return '{'..table.concat(a,',')..'}'
  end
  return 'null'
end
local function write(path,value) local f=io.open(path,'w'); if f then f:write(value); f:close() end end
function astroReply(id,value) write('/tmp/astro-reply-'..id,json({ok=true,value=value})) end
local colors={WATR=0x387ca8,DSTW=0x75a5bb,SLTW=0x467f9f,PLNT=0x85a64b,WOOD=0x70533a,STNE=0x778177,ROCK=0x768075,SAND=0xd2b681,DIRT=0x736344,DMND=0x728e83,GLAS=0x637d77}
for code,color in pairs(colors) do local id=elem['DEFAULT_PT_'..code]; if id then elem.property(id,'Colour',color) end end
local cats={[0]='Walls',[1]='Electronics',[2]='Powered',[3]='Sensors',[4]='Force',[5]='Explosives',[6]='Gases',[7]='Liquids',[8]='Powders',[9]='Solids',[10]='Nuclear',[11]='Special',[12]='Life',[13]='Tools',[15]='Decoration'}
local list={}
for id=1,511 do
 local ok,e=pcall(elem.element,id)
 if ok and e and e.Enabled==1 then
  local props=e.Properties or 0 local state='Solid'
  if bit.band(props,elem.TYPE_PART)~=0 then state='Powder' elseif bit.band(props,elem.TYPE_LIQUID)~=0 then state='Liquid' elseif bit.band(props,elem.TYPE_GAS)~=0 then state='Gas' elseif bit.band(props,elem.TYPE_ENERGY)~=0 then state='Energy' end
  list[#list+1]={id=id,code=e.Name,identifier=e.Identifier,description=e.Description or '',color=string.format('#%06x',e.Colour or 0xffffff),category=cats[e.MenuSection] or 'Special',state=state,temperature=math.floor((e.Temperature or 295.15)-273.15),weight=e.Weight,conductivity=e.HeatConduct,visible=e.MenuVisible==1}
 end
end
-- The built-in cellular automata are distinct tools sharing the LIFE element.
if sim.listDefaultGol then
 local ok,gols=pcall(sim.listDefaultGol)
 if ok then
  for i,g in ipairs(gols) do
   if type(g)=='table' and g.name and g.rule then
    list[#list+1]={id=elem.DEFAULT_PT_LIFE+bit.lshift(i-1,sim.PMAPBITS),code=g.name=='SEED' and 'SEEDL' or g.name=='WALL' and 'WALLL' or g.name,description='Cellular automaton. Rule '..g.rulestr..'.',color=string.format('#%06x',g.color1 or 0x91ba78),category='Life',state='Life',temperature=22,visible=true}
   end
  end
 end
end
list[#list+1]={id=0,code="W-ERASE",name="Erase",description="Erases walls.",color="#808080",category='Walls',state='Wall',temperature=22,wall=true,visible=true}
list[#list+1]={id=1,code="W-CNDTW",name="Conductive Wall",description="Blocks everything. Conductive.",color="#C0C0C0",category='Walls',state='Wall',temperature=22,wall=true,visible=true}
list[#list+1]={id=2,code="W-EWALL",name="Ewall",description="E-Wall. Becomes transparent when electricity is connected.",color="#808080",category='Walls',state='Wall',temperature=22,wall=true,visible=true}
list[#list+1]={id=3,code="W-DTECT",name="Detector",description="Detector. Generates electricity when a particle is inside.",color="#FF8080",category='Walls',state='Wall',temperature=22,wall=true,visible=true}
list[#list+1]={id=4,code="W-STRM",name="Streamline",description="Streamline. Creates a line that follows air movement.",color="#808080",category='Walls',state='Wall',temperature=22,wall=true,visible=true}
list[#list+1]={id=5,code="W-FAN",name="Fan",description="Fan. Accelerates air. Use the line tool to set direction and strength.",color="#8080FF",category='Walls',state='Wall',temperature=22,wall=true,visible=true}
list[#list+1]={id=6,code="W-LIQD",name="Liquid Wall",description="Allows liquids, blocks all other particles. Conductive.",color="#C0C0C0",category='Walls',state='Wall',temperature=22,wall=true,visible=true}
list[#list+1]={id=7,code="W-ABSRB",name="Absorb Wall",description="Absorbs particles but lets air currents through.",color="#808080",category='Walls',state='Wall',temperature=22,wall=true,visible=true}
list[#list+1]={id=8,code="W-WALL",name="Wall",description="Basic wall, blocks everything.",color="#808080",category='Walls',state='Wall',temperature=22,wall=true,visible=true}
list[#list+1]={id=9,code="W-AIR",name="Aironly Wall",description="Allows air, but blocks all particles.",color="#3C3C3C",category='Walls',state='Wall',temperature=22,wall=true,visible=true}
list[#list+1]={id=10,code="W-POWDR",name="Powder Wall",description="Allows powders, blocks all other particles.",color="#575757",category='Walls',state='Wall',temperature=22,wall=true,visible=true}
list[#list+1]={id=11,code="W-CNDTR",name="Conductor",description="Conductor. Allows all particles to pass through and conducts electricity.",color="#FFFF22",category='Walls',state='Wall',temperature=22,wall=true,visible=true}
list[#list+1]={id=12,code="W-EHOLE",name="Ehole",description="E-Hole. absorbs particles, releases them when powered.",color="#242424",category='Walls',state='Wall',temperature=22,wall=true,visible=true}
list[#list+1]={id=13,code="W-GAS",name="Gas Wall",description="Allows gases, blocks all other particles.",color="#579777",category='Walls',state='Wall',temperature=22,wall=true,visible=true}
list[#list+1]={id=14,code="W-GRVTY",name="Gravity Wall",description="Gravity wall. Newtonian Gravity has no effect inside a box drawn with this.",color="#FFEE00",category='Walls',state='Wall',temperature=22,wall=true,visible=true}
list[#list+1]={id=15,code="W-ENRGY",name="Energy Wall",description="Allows energy particles, blocks all other particles.",color="#FFAA00",category='Walls',state='Wall',temperature=22,wall=true,visible=true}
list[#list+1]={id=16,code="W-NOAIR",name="Airblock Wall",description="Allows all particles, but blocks air.",color="#DCDCDC",category='Walls',state='Wall',temperature=22,wall=true,visible=true}
list[#list+1]={id=17,code="W-ERASEA",name="Eraseall",description="Erases walls, particles, and signs.",color="#808080",category='Walls',state='Wall',temperature=22,wall=true,visible=true}
list[#list+1]={id=18,code="W-STASIS",name="Stasis Wall",description="Freezes particles inside the wall in place until powered.",color="#800080",category='Walls',state='Wall',temperature=22,wall=true,visible=true}
write('/tmp/astro-catalog',json(list))
write('/tmp/astro-version',json(tpt.version))
ren.hud(false)
ren.showBrush(0)
ren.decorations(true)
sim.prettyPowders(1)
sim.ambientHeatSim(true)
sim.heatSim(true)
sim.edgeMode(1)
sim.gravityMode(0)
sim.paused(false)
tpt.fpsCap(60)
ren.renderMode(bit.bor(ren.RENDER_BASC,ren.RENDER_FIRE,ren.RENDER_GLOW,ren.RENDER_BLUR))
ren.displayMode(0)
ren.colorMode(0)
astro={x=300,y=180,lx=300,ly=180,down=false,mode='brush',radius=8,id=elem.DEFAULT_PT_SAND,erase=false,ticks=0}
function astroBegin(x,y,mode,radius,id,erase,wall)
 sim.takeSnapshot()
 astro.x=x;astro.y=y;astro.lx=x;astro.ly=y;astro.sx=x;astro.sy=y;astro.mode=mode;astro.radius=radius;astro.id=id;astro.erase=erase;astro.wall=wall
 astro.down=(mode~='sample' and mode~='fill')
 if mode=='fill' then if wall then sim.floodWalls(x,y,erase and 0 or id) else sim.floodParts(x,y,erase and 0 or id) end end
end
function astroEnd()
 if astro.down then
  local id=astro.erase and 0 or astro.id
  if astro.mode=='line' then
   if astro.wall and id==5 then
    local vx=(astro.x-astro.sx)*.025;local vy=(astro.y-astro.sy)*.025
    for x=1,151 do for y=1,94 do if sim.wallMap(x,y)==5 then sim.fanVelocityX(x,y,vx);sim.fanVelocityY(x,y,vy) end end end
   elseif astro.wall then sim.createWallLine(astro.sx,astro.sy,astro.x,astro.y,astro.radius,astro.radius,id)
   else sim.createLine(astro.sx,astro.sy,astro.x,astro.y,astro.radius,astro.radius,id) end
  elseif astro.mode=='box' then if astro.wall then sim.createWallBox(astro.sx,astro.sy,astro.x,astro.y,id) else sim.createBox(astro.sx,astro.sy,astro.x,astro.y,id) end end
 end
 astro.down=false
end
function astroSample(x,y)
 local id=sim.partID(x,y)
 if id then return elem.property(sim.partProperty(id,'type'),'Name') end
 return nil
end
function astroSave()
 local name=sim.saveStamp()
 local f=io.open('stamps/'..name..'.stm','rb')
 if not f then error('Could not write save') end
 local contents=f:read('*a');f:close();write('/tmp/astro-save',contents)
 sim.deleteStamp(name)
 return true
end
function astroInspect()
 local counts={} local total=0 local tempMin=10000 local tempMax=0 local minY=384 local maxY=0
 for id in sim.parts() do
  local code=elem.property(sim.partProperty(id,'type'),'Name')
  counts[code]=(counts[code] or 0)+1;total=total+1
  local t=sim.partProperty(id,'temp');tempMin=math.min(tempMin,t);tempMax=math.max(tempMax,t)
  local _,y=sim.partPosition(id);minY=math.min(minY,y);maxY=math.max(maxY,y)
 end
 return json({count=total,counts=counts,temperatureMin=tempMin,temperatureMax=tempMax,minY=minY,maxY=maxY,paused=sim.paused(),gravity=sim.gravityMode(),queuedFrames=sim.frameRender()})
end
function astroLoad()
 sim.takeSnapshot()
 -- Validate by loading on top first. Restore on failure, then replace on success.
 local ok,err=sim.loadStamp('/tmp/astro-import',0,0)
 sim.historyRestore()
 if not ok then error(err or 'Invalid save file') end
 sim.takeSnapshot();sim.clearSim()
 local loaded,why=sim.loadStamp('/tmp/astro-import',0,0)
 if not loaded then sim.historyRestore();error(why or 'Could not load save') end
 return true
end
local function box(x1,y1,x2,y2,c) sim.createBox(x1,y1,x2,y2,elem['DEFAULT_PT_'..c]) end
local function line(x1,y1,x2,y2,r,c) sim.createLine(x1,y1,x2,y2,r,r,elem['DEFAULT_PT_'..c]) end
local function dot(x,y,r,c) sim.createParts(x,y,r,r,elem['DEFAULT_PT_'..c]) end
function astroPreset(name)
 sim.takeSnapshot();sim.clearSim();sim.paused(true);sim.gravityMode(0);sim.edgeMode(1);sim.airMode(0);sim.ambientHeatSim(true)
 if name=='terrarium' then
  -- A physically simulated cross-section: stone banks, loose sand, water, wood and plants.
  local function ground(x) return 282+67*math.exp(-((x-329)/111)^2)+7*math.sin(x/38)+4*math.sin(x/17) end
  for x=5,606 do
   local y=ground(x)
   for yy=math.floor(y),378 do
    local id=sim.partCreate(-1,x,yy,elem.DEFAULT_PT_DMND)
    if id>=0 then
     local depth=yy-y
     local strata=3*math.sin(yy*.2+x*.015)+2*math.sin(yy*.61)
     local shade=math.floor(35+((yy*11+x*7)%11)+20*math.exp(-depth/18)+strata)
     sim.partProperty(id,'dcolour',0xff000000+(shade+3)*65536+(shade+7)*256+(shade-3))
    end
   end
   if y<322 then
    for yy=math.floor(y)-4,math.floor(y)-1 do local id=sim.partCreate(-1,x,yy,elem.DEFAULT_PT_SAND);if id>=0 then sim.partProperty(id,'dcolour',0xff8e8058) end end
    if y<305 then for yy=math.floor(y)-6-math.floor(3*math.sin(x*1.7)),math.floor(y)-4 do local id=sim.partCreate(-1,x,yy,elem.DEFAULT_PT_PLNT);if id>=0 then sim.partProperty(id,'dcolour',0xff60723c) end end end
   end
  end
  box(6,319,605,377,'WATR')
  local function branch(x,y,length,angle,depth)
   local ex=math.floor(x+math.cos(angle)*length);local ey=math.floor(y+math.sin(angle)*length)
   line(math.floor(x),math.floor(y),ex,ey,math.max(0,depth-2),'WOOD')
   if depth>0 then
    branch(ex,ey,length*.72,angle-.43,depth-1);branch(ex,ey,length*.64,angle+.58,depth-1)
   else
    for dx=-7,7 do for dy=-7,7 do if dx*dx+dy*dy<43 and math.abs(math.sin((ex+dx)*12.9898+(ey+dy)*78.233)*43758.5453)%1>.13 then
     local id=sim.partCreate(-1,ex+dx,ey+dy,elem.DEFAULT_PT_PLNT)
     if id>=0 then local v=(ex*3+ey*5+dx*7+dy*13)%29;sim.partProperty(id,'dcolour',0xff000000+(83+v)*65536+(110+v)*256+49+math.floor(v*.6)) end
    end end end
   end
  end
  for _,tree in ipairs({{48,35},{100,49},{178,39},{498,44},{559,35}}) do
   branch(tree[1],ground(tree[1])-5,tree[2],-1.58,4)
  end
 elseif name=='volcano' then
  for x=90,510 do local y=190+math.abs(x-305)*0.58;line(x,math.floor(y),x,377,0,'DMND') end
  sim.clearRect(289,183,33,196)
  box(270,313,340,377,'LAVA');box(291,273,319,314,'LAVA');box(6,322,80,377,'WATR');box(523,322,605,377,'WATR')
  dot(305,344,20,'LAVA');sim.pressure(69,80,14,12,12)
 elseif name=='circuit' then
  line(115,160,480,160,2,'METL');line(480,160,480,280,2,'METL');line(480,280,115,280,2,'METL');line(115,280,115,160,2,'METL')
  box(105,205,125,235,'BTRY');box(286,154,320,166,'SPRK');dot(479,221,10,'NBLE');box(474,202,485,213,'GLAS')
 elseif name=='alchemy' then
  for _,x in ipairs({84,260,436}) do line(x,165,x,307,2,'DMND');line(x,307,x+92,307,2,'DMND');line(x+92,307,x+92,165,2,'DMND') end
  box(88,224,172,302,'ICEI');box(264,225,348,302,'WATR');box(440,236,524,302,'LAVA')
  dot(305,320,8,'FIRE')
 end
 sim.paused(false)
 return true
end
astroPreset('terrarium')
event.register(event.TICK,function()
 local tickOk,tickError=pcall(function()
 astro.ticks=astro.ticks+1
 local f=io.open('/tmp/astro-command','r')
 if f then
  local command=f:read('*a');f:close();os.remove('/tmp/astro-command')
  local id=command:match('^(%d+)\n');local body=command:match('^%d+\n(.*)$')
  if id and body then
   local func,err=load(body,'astropowder-command','t')
   local ok,value=false,err
   if func then ok,value=pcall(func) end
   write('/tmp/astro-reply-'..id,json({ok=ok,value=tostring(value or '')}))
  end
 end
 local p=io.open('/tmp/astro-pointer','r')
 if p then local x,y=p:read('*a'):match('^(%d+),(%d+)$');p:close();if x then astro.x=tonumber(x);astro.y=tonumber(y) end end
 if astro.down then
  if astro.mode=='brush' or astro.mode=='erase' then
   local id=(astro.erase or astro.mode=='erase') and 0 or astro.id
   if astro.wall then sim.createWallLine(astro.lx,astro.ly,astro.x,astro.y,astro.radius,astro.radius,id)
   else sim.createLine(astro.lx,astro.ly,astro.x,astro.y,astro.radius,astro.radius,id) end
   if astro.mode=='erase' then sim.createWallLine(astro.lx,astro.ly,astro.x,astro.y,astro.radius,astro.radius,0) end
  elseif astro.mode=='heat' or astro.mode=='cool' then
   local center=sim.partID(astro.x,astro.y)
   if center then local t=sim.partProperty(center,'temp');sim.partProperty(center,'temp',math.min(9999,math.max(0,t+(astro.mode=='heat' and 35 or -35)))) end
   for id in sim.neighbors(astro.x,astro.y,astro.radius,astro.radius) do local t=sim.partProperty(id,'temp');sim.partProperty(id,'temp',math.min(9999,math.max(0,t+(astro.mode=='heat' and 35 or -35)))) end
  end
  astro.lx=astro.x;astro.ly=astro.y
 end
 if astro.ticks%8==0 then
  local id=sim.partID(astro.x,astro.y)
  local name='Empty';local temp=sim.ambientAirTemp()-273.15
  if id then name=elem.property(sim.partProperty(id,'type'),'Name');temp=sim.partProperty(id,'temp')-273.15 end
  write('/tmp/astro-stats',json({count=sim.partCount(),temperature=temp,pressure=sim.pressure(math.floor(astro.x/4),math.floor(astro.y/4)),hover=name,paused=sim.paused()}))
 end
 end)
 if not tickOk then write('/tmp/astro-runtime-failure',tostring(tickError)) end
end)
write('/tmp/astro-ready','true')
end
local ok,err=pcall(astroStartup)
if not ok then local f=io.open('/tmp/astro-failure','w');if f then f:write(tostring(err));f:close() end end
