#INCLUDE JsGraphX3D.inc
#INCLUDE JsgMouseHandler.inc
#INCLUDE EarthMap.inc
#INCLUDE ControlPanel.inc
#INCLUDE Tabs.inc
#INCLUDE DataX.inc
#INCLUDE TextControl.inc
#INCLUDE ModelAnimation.inc


<style>
.Wiki .ControlPanel { margin: 0; }
textarea.ListingDisplay {
  width: 100%;
  font-family: Courier;
  margin-bottom: 1em;
}
#ResetButton { }
#BackButton { margin-left: 1.2em; }
</style>

{{TabSelectorsTop| DomeDemoTabs | TopMargin }}
{{TabSelButton| Intro | IntroButton }}
{{TabSelButton| Eclipses | EclipsesButton }}
{{TabSelButton| Equinox | EquinoxButton }}
{{TabSelButton| DayNight | DayNightButton }}
{{TabSelButton| Poles | PolesButton }}
{{TabSelButton| Stars | StarsButton }}
{{TabSelButton| Reset | ResetButton }}
{{TabSelButton| &lt;&lt; | BackButton }}
{{TabSelButton| Play | PlayButton }}
{{TabSelButton| &gt;&gt; | ForwButton }}
{{TabSelButton| 0 | CountButton }}
{{EndTabSelectors}}

<jscript>

var ThisPageUrl = 'http://walter.bislins.ch/bloge/index.asp?page=Flat+Earth+Dome+Model';
var ThisPageShortUrl = 'index.asp?page=Flat+Earth+Dome+Model';

// set EarthMap colors and polygone mode (3D)
EarthMap.SetWaterColor( '#d3e2f5' );
EarthMap.SetLakeColor( '#d3e2f5', '#8cbe5d' );
EarthMap.SetContinentColor( null, '#c6dfaf', '#8cbe5d' );
EarthMap.SetLandColor( 'Antarctica', '#eee', '#ccc' );
EarthMap.FEMode = 2; // use PolygonOnPlane to draw map

// some useful functions
function ToRad( x ) { return x * Math.PI / 180; }
function ToDeg( x ) { return x * 180 / Math.PI; }
function sqr( x ) { return x * x; }
function Limit1( x ) { return x < -1 ? -1 : x > 1 ? 1 : x; }
function Limit01( x ) { return x < 0 ? 0 : x > 1 ? 1 : x }

function ToRange( x, max ) {
  // maps x to a range of 0 inclusive to max exclusive
  var v = Math.abs(x) % max;
  if (x < 0) v = max - v;
  return v;
}

// The metadata are used to serialize and parse the state of the App.
// The metadata properties represent all properties of the App, that can be changed by Demos.

var FeDomeAppMetaData = {
  Compact: false,
  DefaultPrec: 8,
  Properties: [
    { Name: 'Description',        Type: 'str',  Default: '' },
    { Name: 'PointerFrom',        Type: 'arr',  Size: 2, ArrayType: 'int', Default: [ 0, 0 ] },
    { Name: 'PointerTo',          Type: 'arr',  Size: 2, ArrayType: 'int', Default: [ 0, 0 ] },
    { Name: 'PointerText',        Type: 'str',  Default: '' },

    { Name: 'ObserverLat',        Type: 'num',  Default: 0.0 },
    { Name: 'ObserverLong',       Type: 'num',  Default: 15.0 },
    { Name: 'Zoom',               Type: 'num',  Default: 1.4 },
    { Name: 'CameraDirection',    Type: 'num',  Default: 30.0 },
    { Name: 'CameraHeight',       Type: 'num',  Default: 25.0 },
    { Name: 'CameraDistance',     Type: 'num',  Default: 200150.0 },
    { Name: 'DateTime',           Type: 'num',  Default: 82.5 },
    { Name: 'DomeSize',           Type: 'num',  Default: 1.0 },
    { Name: 'DomeHeight',         Type: 'num',  Default: 9000.0 },

    { Name: 'ShowFeGrid',         Type: 'bool', Default: true },
    { Name: 'ShowShadow',         Type: 'bool', Default: true },
    { Name: 'ShowDomeGrid',       Type: 'bool', Default: true },
    { Name: 'ShowSunTrack',       Type: 'bool', Default: false },
    { Name: 'ShowMoonTrack',      Type: 'bool', Default: false },
    { Name: 'ShowSphere',         Type: 'bool', Default: true },
    { Name: 'ShowStars',          Type: 'bool', Default: false },
    { Name: 'ShowDomeRays',       Type: 'bool', Default: true },
    { Name: 'ShowSphereRays',     Type: 'bool', Default: true },
    { Name: 'ShowManyRays',       Type: 'bool', Default: false },

    { Name: 'RayParameter',       Type: 'num',  Default: 1 },
    { Name: 'RayTarget',          Type: 'int',  Default: 0 },
    { Name: 'RaySource',          Type: 'int',  Default: 0 },

  ],
};

// the App
// ==============================

// Coordinate Systems
// * EarthRotAngle
// * Sun      : Angle, Coord, LatLong
// * Celestial: LatLong, Coord (unit Vectors)
// * Globe    : Angles(azimuth,elevation), LatLong, LocalCoord
// * FE       : Coord, LatLong, CelestialAngles
// * Dome     : Coord
//
// Converter functions
// * LatLongToCoord( latDeg, longDeg, length )
// * CoordToLatLong( coord ) returns { lat, long }
// * LocalGlobeCoordToAngles( coord ) returns { azimtuth, elevation }
// * AnglesToCoord( angles, length )
// * AnglesToGlobalFeCoord( angles, length )
// * DateToEarthRotAngle( dateTime )
// * DateToSunAngleCelest( dateTime )

// * SunAngleToCelestCoord( sunAngleDeg )
// * CelestLatLongToLocalGlobeCoord( latDeg, longDeg, length ) {
// * CelestLatLongToDomeCoord( latDeg, longDeg )
// * CelestLatLongToGlobalFeSphereCoord( latDef, longDeg, length )
// * CelestCoordToLocalGlobeCoord( celestCoord )
// * CelestCoordToLocalGlobeAngles( celestCoord )
// * CelestCoordToDomeCoord( vect )
// * CelestCoordToGlobalFeCoord( vect )

// * FeLatLongToGlobalFeCoord( latDeg, longDeg )
// * DomeCoordToGlobalFeCoord( vect )
// * LocalGlobeCoordToLocalFeCoord( vect )
// * LocalGlobeCoordToGlobalFeCoord( vect )

var FeDomeApp = {
  // parameters
  ObserverLat:         0.0, // degrees -90..90; x < 0 is South, x > 0 is North
  ObserverLong:       15.0, // degrees -180..180; x < 0 is West, x > 0 is East
  Zoom:                1.4,
  CameraDirection:    30.0, // degrees -180..180
  CameraHeight:       25.0, // degrees 0..89.9
  CameraDistance: 200150.0, // km
  DateTime:           82.5, // date and time until 1.1.2017
  DateTimeLast:       82.5,
  DayOfYear:          82.0, // 0..364 (78 = spring equinox)
  DayOfYearLast:      82.0,
  Time:               12.0, // 0..24 UT
  TimeLast:           12.0,
  DomeSize:            1.0, // times RadiusFE gives DomeRadius
  DomeHeight:       9000.0, // km
  RayParameter:           1, // controls the distance of the bezier control point from the ray point at observer
  ShowFeGrid:          true,
  ShowShadow:          true,
  ShowDomeGrid:        true,
  ShowSunTrack:       false,
  ShowMoonTrack:      false,
  ShowSphere:          true,
  ShowStars:          false,
  ShowDomeRays:        true,
  ShowSphereRays:      true,
  ShowManyRays:       false,

  RayTarget:              0, // 0 -> observer, 1 -> Flat Earth
  RaySource:              0, // 0 -> sun, 1 -> moon, 2 -> star

  ManyRaysEnabled:    false, // = ((this.ShowStars && this.ShowDomeRays) || this.RayTarget == 1)
  IsRayTargetObserver: true,

  // Description parameters
  Description:           '',
  PointerFrom:        [0,0], // Note: do not replace the arrays, change their values!!!
  PointerTo:          [0,0],
  PointerText:           '',

  // constants
  msPerDay:        86400000,
  ZeroDate:               0,  // days of 1.1.2017 since 1.1.1970
  SidericDay:      23.93447,  // hours
  SunEcliptic:        23.44,  // degrees from earth equator plane
  SunAngleOffset:       78.5, // days since DateTime = 0 (spring equinox = 20.3. at 12:00)
  SunPeriod:         365.256363004, // days
  MoonEcliptic:        5.145, // degrees from sun ecliptic plane
  MoonAngleOffset:      0.48, // days from ecliptic knot to match solar eclipse from 21.8.2017 (empirically)
  MoonPeriod:           27.321661, // 27.322, // *1.00342, // sidereal days + empirical correction 
  MoonPrecessPeriod: -6798.383, // days, moon ecliptic precessed counter moon orbit direction
  MoonPrecessOffset:  -301.996,   // days from solar sclipse 21.8.2017 (empiric)

  RadiusEarth:      6371.0, // km (not needed)
  RadiusSun:      696342.0, // km (not needed)
  DistSun:     149600000.0, // km
  RadiusMoon:       1738.0, // km (not needed)
  DistMoon:       384000.0, // km

  RadiusFE:        20015.0, // km
  RadiusSunFE:        26.2, // km (not needed)
  RadiusMoonFE:       26.2, // km (not needed)

  ZoomMin:             1.0,
  ZoomMax:            10.0,
  DomeHeightMin:    2000.0, // km
  DomeHeightMax:   20015.0, // km

  // computed values

  RadiusSphere: 5000.0, // km
  // planes for graphic functions PolygonOnPlane() etc.
  DefaultPlane: new JsgPlane( [0,0,0], [1,0,0], [0,1,0] ),
  FePlane: new JsgPlane( [0,0,0], [0,1,0], [-1,0,0] ),  // for flat earth 2D graphic

  EarthRotAngle:                          0, // rotation angle of day and time since 20.3. 12:00 in degrees
  MoonPrecessAngle:                       0, // current moon precession angle
  TransMatEarthRot:          JsgMat3.Unit(),
  TransMatCelestToGlobe:     JsgMat3.Unit(),
  TransMatSunToCelest:       JsgMat3.Unit(),
  TransMatMoonToCelest:      JsgMat3.Unit(),
  TransMatLocalFeToGlobalFe: JsgMat3.Unit(),

  SunCelestAngle:                         0,
  SunCelestCoord:           JsgVect3.Null(),
  SunCelestLatLong:      { lat: 0, lng: 0 },
  SunAnglesGlobe: { azimuth: 0, elevation: 0 },
  SunDomeCoord:             JsgVect3.Null(),
  SunLocalGlobeCoord:       JsgVect3.Null(),
  SunFeCelestSphereCoord:   JsgVect3.Null(),

  MoonCelestAngle:                        0,
  MoonCelestCoord:          JsgVect3.Null(),
  MoonNorthCelestCoord:     JsgVect3.Null(),
  MoonCelestLatLong:     { lat: 0, lng: 0 },
  MoonAnglesGlobe: { azimuth: 0, elevation: 0 },
  MoonDomeCoord:            JsgVect3.Null(),
  MoonLocalGlobeCoord:      JsgVect3.Null(),
  MoonFeCelestSphereCoord:  JsgVect3.Null(),

  ObserverFeCoord:          JsgVect3.Null(),

  // private
  GraphObject: null,
  MouseHandler: null,
  IsInit:  false,
  pause: 0, // used for animations
  MouseViewRotationIncrement: 200,
  MousePositionIncrement:     300,

  // functions

  CreateFeGraph: function() {
    this.GraphObject = NewGraphX3D( {
      Id: 'FeGraph',
      Width: '100%',
      Height: '56%',
      DrawFunc: function(g) { FeDomeApp.Draw(g); },
      //OnClick: function(e,g) { FeDomeApp.DrawMousePos(g,e.offsetX,e.offsetY); },
      AutoReset: false,
      AutoClear: false,
      AutoScalePix: true,
      BorderWidth: 0,
    } );
    this.MouseHandler = new JsgMouseHandler( this, this.GraphObject );
  },

  Init: function() {
    if (this.IsInit) return;
    this.TransMatSunToCelest = this.CompTransMatSunToCelest( this.SunEcliptic );
    var date = new Date();
    date.setUTCFullYear( 2017 );
    date.setUTCMonth( 0 );
    date.setUTCDate( 1 );
    date.setUTCHours( 0 );
    date.setUTCMinutes( 0 );
    date.setUTCSeconds( 0 );
    date.setUTCMilliseconds( 0 );
    this.ZeroDate = date.getTime() / this.msPerDay;
    this.IsInit = true;
  },

  ClearDescription: function() {
    this.Description = '';
    this.PointerFrom[0] = 0;
    this.PointerFrom[1] = 0;
    this.PointerTo[0] = 0;
    this.PointerTo[1] = 0;
    this.PointerText = '';
  },

  OnMouseMove: function ( x, y, dx, dy, boost, event ) {
    var g = this.GraphObject;
    if (event.ctrlKey) {
      var increment = this.MousePositionIncrement;
      this.ObserverLat -= dy / g.VpInnerWidth * increment;
      this.ObserverLong += dx / g.VpInnerHeight * increment;
      if (this.ObserverLat < -90) this.ObserverLat = -90;
      if (this.ObserverLat > 90) this.ObserverLat = 90;
      if (this.ObserverLong < -180) this.ObserverLong += 360;
      if (this.ObserverLong > 180) this.ObserverLong -= 360;
    } else {
      var increment = this.MouseViewRotationIncrement * boost;
      this.CameraDirection += -dx / g.VpInnerWidth * increment;
      this.CameraHeight += dy / g.VpInnerHeight * increment;
      if (this.CameraDirection < -360) this.CameraDirection += 360;
      if (this.CameraDirection > 360) this.CameraDirection -= 360;
      if (this.CameraHeight < 0) this.CameraHeight = 0;
      if (this.CameraHeight > 89.9) this.CameraHeight = 89.9;
    }
    this.ClearDescription();
    UpdateAll();
  },

  OnScroll: function( up, factor, shiftKey, crtlKey, altKey ) {
    this.Zoom *= factor;
    if (this.Zoom < 1) this.Zoom = 1;
    if (this.Zoom > 10) this.Zoom = 10;
    this.ClearDescription();
    UpdateAll();
  },

  Update: function() {
    this.Init();

    this.ManyRaysEnabled = ((this.ShowStars && this.ShowDomeRays) || this.RayTarget == 1);
    this.IsRayTargetObserver = this.RayTarget == 0;

    // limit input values
    if (this.ObserverLat < -90) this.ObserverLat = -90;
    if (this.ObserverLat > 90) this.ObserverLat = 90;
    if (this.CameraHeight < -30) this.CameraHeight = -30;
    if (this.CameraHeight > 89.9) this.CameraHeight = 89.9;
    var camDistMin = 2 * this.DomeSize * this.RadiusFE;
    if (this.CameraDistance < camDistMin) this.CameraDistance = camDistMin;
    if (this.Zoom < 0.1) this.Zoom = 0.1;
    if (this.Zoom > 100) this.Zoom = 100;
    if (this.DomeSize < 1) this.DomeSize = 1;
    if (this.DomeSize > 5) this.DomeSize = 5;
    if (this.DomeHeight < this.DomeHeightMin) this.DomeHeight = this.DomeHeightMin;
    if (this.DomeHeight > this.DomeHeightMax) this.DomeHeight = this.DomeHeightMax;
    if (this.RayParameter < 0.5) this.RayParameter = 0.5;
    if (this.RayParameter > 2.0) this.RayParameter = 2.0;

    EarthMap.Radius = this.RadiusFE;

    // update date and time from DateTime or date-time sliders
    this.DayOfYear = Math.round( this.DayOfYear );
    if (this.DayOfYear != this.DayOfYearLast || this.Time != this.TimeLast) {
      this.DateTime = this.DayOfYear + this.Time / 24;
    } else {
      this.DayOfYear = Math.floor( this.DateTime );
      this.Time = (this.DateTime - this.DayOfYear) * 24;
    }
    this.DateTimeLast = this.DateTime;
    this.DayOfYearLast = this.DayOfYear;
    this.TimeLast = this.Time;

    this.ObserverFeCoord = this.FeLatLongToGlobalFeCoord( this.ObserverLat, this.ObserverLong );
    this.EarthRotAngle = this.DateToEarthRotAngle( this.DateTime );
    this.MoonPrecessAngle = this.DateToMoonPrecessAngle( this.DateTime );

    this.TransMatEarthRot = JsgMat3.RotatingZ( ToRad( -this.EarthRotAngle ) );
    this.TransMatMoonToCelest = this.CompTransMatMoonToCelest( this.SunEcliptic, this.MoonEcliptic, this.MoonPrecessAngle );
    this.TransMatCelestToGlobe = this.CompTransMatCelestToGlobe( this.ObserverLat, this.ObserverLong );
    this.TransMatDomeToFe = this.CompTransMatDomeToFe( this.EarthRotAngle );
    this.TransMatLocalFeToGlobalFe = this.CompTransMatLocalFeToGlobalFe( this.ObserverFeCoord, this.ObserverLong );

    this.SunCelestAngle = this.DateToSunAngleCelest( this.DateTime );
    this.SunCelestCoord = this.SunAngleToCelestCoord( this.SunCelestAngle );
    this.SunCelestLatLong = this.CoordToLatLong( this.SunCelestCoord );
    this.SunDomeCoord = this.CelestLatLongToDomeCoord( this.SunCelestLatLong.lat, this.SunCelestLatLong.lng );
    this.SunLocalGlobeCoord = this.CelestCoordToLocalGlobeCoord( this.SunCelestCoord );
    this.SunFeCelestSphereCoord = this.LocalGlobeCoordToGlobalFeCoord( JsgVect3.Scale( this.SunLocalGlobeCoord, this.RadiusSphere ) );

    this.MoonCelestAngle = this.DateToMoonAngleCelest( this.DateTime );
    this.MoonCelestCoord = this.MoonAngleToCelestCoord( this.MoonCelestAngle );
    this.MoonNorthCelestCoord = this.CompMoonNorthCelestCoord();
    this.MoonCelestLatLong = this.CoordToLatLong( this.MoonCelestCoord );
    this.MoonDomeCoord = this.CelestLatLongToDomeCoord( this.MoonCelestLatLong.lat, this.MoonCelestLatLong.lng );
    this.MoonAnglesGlobe = this.CelestCoordToLocalGlobeAngles( this.MoonCelestCoord );
    this.MoonLocalGlobeCoord = this.CelestCoordToLocalGlobeCoord( this.MoonCelestCoord );
    this.MoonFeCelestSphereCoord = this.LocalGlobeCoordToGlobalFeCoord( JsgVect3.Scale( this.MoonLocalGlobeCoord, this.RadiusSphere ) );

    this.SunAnglesGlobe = this.CelestCoordToLocalGlobeAngles( this.SunCelestCoord );
    var zoomParam = Limit01( (this.Zoom - 2) / (this.ZoomMax - 2) );
    this.RadiusSphere = (1-zoomParam) * 3000 + 2000;
    if (this.DomeHeight < this.RadiusSphere) this.RadiusSphere = this.DomeHeight;
  },

  DateToEarthRotAngle: function( dateTime ) {
    var angleDeg = 360 * (dateTime - this.SunAngleOffset) * 24 / this.SidericDay;
    return ToRange( angleDeg, 360 );
  },

  CompTransMatCelestToGlobe: function( obsLatDeg, obsLongDeg ) {
    // requires this.EarthRotAngle
    return JsgMat3.RotatingY( ToRad(obsLatDeg), JsgMat3.RotatingZ( ToRad(-obsLongDeg-this.EarthRotAngle) ) );
  },

  CompTransMatLocalFeToGlobalFe: function( observerCoord, observerLongDeg ) {
    var rotationMat = JsgMat3.RotatingZ( ToRad(observerLongDeg) );
    return JsgMat3.Moving( observerCoord[0], observerCoord[1], observerCoord[2], rotationMat );
  },

  CompTransMatSunToCelest: function( eclipseDeg ) {
    return JsgMat3.RotatingX( ToRad(eclipseDeg) );
  },

  CompTransMatMoonToCelest: function( sunEclipticDeg, moonEclipticDeg, moonPrecessAngleDeg ) {
    var transMoonToMoonEcliptic = JsgMat3.RotatingX( ToRad(moonEclipticDeg) );
    var transMoonToSunEcliptic = JsgMat3.RotatingZ( ToRad(moonPrecessAngleDeg), transMoonToMoonEcliptic );
    var transMoonToCelest = JsgMat3.RotatingX( ToRad(sunEclipticDeg), transMoonToSunEcliptic );
    return transMoonToCelest;
  },

  CompTransMatDomeToFe: function( earthRotAngleDeg ) {
    return JsgMat3.RotatingZ( -ToRad(earthRotAngleDeg) );
  },

  SunAngleToCelestCoord: function( sunAngleDeg ) {
    // requires this.TransMatSunToCelest
    // returns unit vector to sun position in celestial coord
    var sunAngleRad = ToRad( sunAngleDeg );
    var sunCoord = [ Math.cos(sunAngleRad), Math.sin(sunAngleRad), 0 ];
    return JsgMat3.Trans( this.TransMatSunToCelest, sunCoord );
  },

  MoonAngleToCelestCoord: function( moonAngleDeg ) {
    // requires this.TransMatMoonToCelest
    // returns unit vector to moon position in celestial coord
    var moonAngleRad = ToRad( moonAngleDeg );
    var moonCoord = [ Math.cos(moonAngleRad), Math.sin(moonAngleRad), 0 ];
    return JsgMat3.Trans( this.TransMatMoonToCelest, moonCoord );
  },

  CompMoonNorthCelestCoord: function() {
    // requires this.TransMatMoonToCelest
    // returns unit vector in celest coords that is the direction of the moon's northpole
    return JsgMat3.Trans( this.TransMatMoonToCelest, [0,0,1] );
  },

  DateToSunAngleCelest: function( dateTime ) {
    return 360 * (dateTime - this.SunAngleOffset) / this.SunPeriod;
  },

  DateToMoonPrecessAngle: function( dateTime ) {
    return 360 * (dateTime - this.MoonPrecessOffset) / this.MoonPrecessPeriod;
  },

  DateToMoonAngleCelest: function( dateTime ) {
    return 360 * (dateTime - this.MoonAngleOffset) / this.MoonPeriod;
  },

  CelestCoordToLocalGlobeCoord: function( celestCoord ) {
    // requires this.TransMatCelestToGlobe
    return JsgMat3.Trans( this.TransMatCelestToGlobe, celestCoord );
  },

  CelestLatLongToLocalGlobeCoord: function( latDeg, longDeg, length ) {
    return this.CelestCoordToLocalGlobeCoord( this.LatLongToCoord( latDeg, longDeg, length ) );
  },

  CelestLatLongToGlobalFeSphereCoord: function( latDeg, longDeg, length ) {
    var localGlobeCoord = this.CelestLatLongToLocalGlobeCoord( latDeg, longDeg, length );
    var globalFeCoord = this.LocalGlobeCoordToGlobalFeCoord( localGlobeCoord );
    return globalFeCoord;
  },

  CelestCoordToLocalGlobeAngles: function( celestCoord ) {
    // requires this.TransMatCelestToGlobe
    // returns { azimuth, elevation } object, angles in degrees
    return this.LocalGlobeCoordToAngles( this.CelestCoordToLocalGlobeCoord( celestCoord ) );
  },

  LatLongToCoord: function( latDeg, longDeg, length ) {
    return JsgVect3.FromAngle( longDeg, latDeg, length );
  },

  CoordToLatLong: function( coord ) {
    // returns { lat, long } object, angles in degrees
    var ret  = {};
    var vectXY = [ coord[0], coord[1], 0 ];
    if (JsgVect3.Length(vectXY) == 0) {
      // coord is up or down, so long is undefined -> set long = 0
      ret.lng = 0;
      ret.lat = (coord[2] >= 0) ? 90 : -90;
      return ret;
    }
    // assert JsgVect3.Length(vectXY) > 0, so Norm returns no null vector
    var vectXYNorm = JsgVect3.Norm( vectXY );
    var coordNorm = JsgVect3.Norm( coord );
    ret.lat = 90 - ToDeg( Math.acos( Limit1( JsgVect3.ScalarProd( [0,0,1], coordNorm ) ) ) );
    ret.lng = ToDeg( Math.acos( Limit1( JsgVect3.ScalarProd( [1,0,0], vectXYNorm ) ) ) );
    if (vectXYNorm[1] < 0) ret.lng *= -1;
    return ret;
  },

  LocalGlobeCoordToAngles: function( coord ) {
    // returns { azimuth, elevation } object, angles in degrees
    // note: observer coordinates are: x -> zenith, y -> east, z -> north
    var ret  = {};
    var vectYZNorm = JsgVect3.Norm( [ 0, coord[1], coord[2] ] );
    var coordNorm = JsgVect3.Norm( coord );
    ret.azimuth = ToDeg( Math.acos( Limit1( JsgVect3.ScalarProd( [0,0,1], vectYZNorm ) ) ) );
    if (vectYZNorm[1] < 0) ret.azimuth = 360 - ret.azimuth;
    ret.elevation = 90 - ToDeg( Math.acos( Limit1( JsgVect3.ScalarProd( [1,0,0], coordNorm ) ) ) );
    return ret;
  },

  FeLatLongToGlobalFeCoord: function( latDeg, longDeg ) {
    // requires EarthMap.Radius, this.FePlane
    return JsgVect3.Copy( this.FePlane.PointOnPlane( EarthMap.PointOnFE( latDeg, longDeg ) ) );
  },

  CelestLatLongToDomeCoord: function( latDeg, longDeg ) {
    // latDeg, long in degrees
    var domeRadius = this.DomeSize * this.RadiusFE;
    var radialDist = this.RadiusFE * (90 - latDeg) / 180;
    var longRad = ToRad( longDeg );
    var x = radialDist * Math.cos( longRad );
    var y = radialDist * Math.sin( longRad );
    var z = Math.sqrt( sqr(domeRadius) - sqr(radialDist) ) * this.DomeHeight / domeRadius;
    return [ x, y, z ];
  },

  CelestCoordToDomeCoord: function( vect ) {
    var latlong = this.CoordToLatLong( vect );
    return this.CelestLatLongToDomeCoord( latlong.lat, latlong.lng );
  },

  CelestCoordToGlobalFeCoord: function( vect ) {
    var latlong = this.CoordToLatLong( vect );
    return this.CelestLatLongToGlobalFeSphereCoord( latlong.lat, latlong.lng, this.RadiusFE );
  },

  DomeCoordToGlobalFeCoord: function( vect ) {
    return JsgMat3.Trans( this.TransMatDomeToFe, vect ) ;
  },

  LocalGlobeCoordToLocalFeCoord: function( vect ) {
    return [ -vect[2], vect[1], vect[0] ];
  },

  LocalGlobeCoordToGlobalFeCoord: function( vect ) {
    return JsgMat3.Trans( this.TransMatLocalFeToGlobalFe, this.LocalGlobeCoordToLocalFeCoord( vect ) );
  },

  Draw: function( g ) {
    g = g || this.GraphObject;

    if (!this.IsInit) this.Update();
    EarthMap.Radius = this.RadiusFE;
    g.Reset3D();

    // compute scene size and init camera
    var sceneSize = 2 * this.CameraDistance * Math.tan( Math.asin( this.RadiusFE / this.CameraDistance ) );
    g.SetCameraScale( sceneSize );
    g.SetCameraZoom( this.Zoom );
    g.SetCameraView( [0,0,0], this.CameraDirection, this.CameraHeight, this.CameraDistance );
    g.SetWindowToCameraScreen();
    g.SetGraphClipping( true, 'viewport', 0 );

    // this plane transforms the flat earth from upright to horizontal
    g.SetPlane( this.FePlane.Copy() );

    // compute camera viewing center as a position between half dome height and observer pos depending on zoom
    var halfDomeHeight = [ 0, 0, this.DomeHeight / 2 ];
    var targetFeCoord = this.ObserverFeCoord;
    if (this.RayTarget == 1 && this.RaySource == 2) {
      // if ray source is star then zoom in on star position instead of observer position
      var starDomeCoord = this.CelestLatLongToDomeCoord( this.ObserverLat, this.ObserverLong );
      targetFeCoord = this.DomeCoordToGlobalFeCoord( starDomeCoord );
    }
    var obsToHalfHeight = JsgVect3.Sub( halfDomeHeight, targetFeCoord );
    var halfWay = Limit01( (this.Zoom - this.ZoomMin) / (this.ZoomMax - this.ZoomMin) );
    halfWay = Math.pow( halfWay-1, 4 );
    var cameraViewCenter = JsgVect3.Add( targetFeCoord, JsgVect3.Scale( obsToHalfHeight, halfWay ) );
    g.SetCameraView( cameraViewCenter, this.CameraDirection, this.CameraHeight, this.CameraDistance );

    // draw flat earth map
    EarthMap.DrawFlatEarth( g );

    // draw flat earth night time shadow
    if (this.ShowShadow) {
      this.DrawFeNightShadow( g );
    }

    // draw flat earth grid
    if (this.ShowFeGrid) {
      g.SetAlpha( 0.2 );
      g.SetLineAttr( 'gray', 1 );
      EarthMap.DrawFlatEarthGrid( g, 15, 15 );
      g.SetLineAttr( 'black', 1 );
      EarthMap.DrawFlatEarthEquator( g );
      EarthMap.DrawFlatEarthBorder( g );
      EarthMap.DrawFlatEarthMeridian( g );
      g.SetAlpha( 1 );
    }

    // draw flat earth center
    g.SetAreaAttr( 'white', 'red', 1 );
    g.PolygonOnPlane( [ 0, 100, 500, 100, 0, -100, -500, -100, 0 ], [ 500, 100, 0, -100, -500, -100, 0, 100, 500 ], 3 );

    // draw observer
    if (this.RayTarget == 0) {
      this.DrawObserver( g );
    }

    // draw local celstial sphere
    if (this.RayTarget == 0 && this.ShowSphere) {
      this.DrawFeCelestSphere( g );
    }

    // draw local celestial sphere stars
    if (this.RayTarget == 0 && this.ShowStars && this.ShowSphere) {
      this.DrawFeCelestSphereStars( g, 6, 12 );
    }

    // draw line to moon and celestial sphere moon

    this.DrawMoonRays( g );

    // draw line to sun

    this.DrawSunRays( g );

    // draw star rays
    this.DrawStarsRays( g );

    // draw dome
    g.TransRotateZ3D( -this.EarthRotAngle );

    // draw dome grid
    if (this.ShowDomeGrid) {
      g.SetAlpha( 0.2 );
      g.SetLineAttr( '#44f', 1 );
      this.DrawDomeGrid( g, 12, 24 );
      g.SetLineAttr( 'gray', 1 );
      this.DrawDomeOutline( g, 24 );
      g.SetAlpha( 1 );
    }

    if (this.ShowDomeGrid || this.ShowSunTrack || this.ShowMoonTrack) {
      g.SetAlpha( 0.2 );
      g.SetLineAttr( '#00f', 2 );
      this.DrawDomeLatitudeLine( g, 0 );   // equator
      g.SetLineAttr( '#00f', 1 );
      this.DrawDomeLongitudeLine( g, 0 );  // meridian
      g.Line3D( [ 0, 0, 0 ], [ 0, 0, this.DomeHeight ] ); // dome axes
      g.SetAlpha( 1 );
    }

    if (this.ShowSunTrack || this.ShowMoonTrack) {
      g.SetAlpha( 0.2 );
      g.SetLineAttr( '#00f', 1.5 );
      this.DrawDomeLatitudeLine( g,  this.SunEcliptic );   // solstices
      this.DrawDomeLatitudeLine( g, -this.SunEcliptic );   // solstices
      g.SetAlpha( 0.5 );
      this.DrawDomeLatitudeLine( g, -90 ); // south pole latitude
      g.SetAlpha( 1 );
    }

    if (this.ShowMoonTrack) {
      // draw moon path
      g.SetLineAttr( '#aaa', 1 );
      this.DrawDomeLatitudeLine( g, this.MoonCelestLatLong.lat );

      // moon ecliptic
      this.DrawMoonTrack( g );
    }

    if (this.ShowSunTrack) {
      // draw sun path
      g.SetLineAttr( 'orange', 1 );
      this.DrawDomeLatitudeLine( g, this.SunCelestLatLong.lat );

      // sun ecliptic
      this.DrawSunTrack( g );
    }

    // draw dome stars
    if (this.ShowStars && this.RayTarget == 0) {
      this.DrawDomeStars( g, 6, 12 );
    }

    // draw moon
    g.SetMarkerAttr( 'Circle', 10, '#888', 'white', 1 );
    g.Marker3D( this.MoonDomeCoord, 3 );

    // draw sun
    g.SetMarkerAttr( 'Circle', 20, 'white', 'white', 1 );
    g.SetAlpha( 0.5 );
    g.Marker3D( this.SunDomeCoord, 2 );
    g.SetMarkerAttr( 'Circle', 15, 'white', 'white', 1 );
    g.Marker3D( this.SunDomeCoord, 2 );
    g.SetMarkerAttr( 'Circle', 10, 'orange', 'white', 1 );
    g.SetAlpha( 1 );
    g.Marker3D( this.SunDomeCoord, 3 );
    g.ResetTrans3D();

    this.DrawDateTime( g );

    if (!this.ShowStars && this.RayTarget == 0) {
      this.DrawSunMoonAzimuthElevation( g );
      this.DrawMoonPhase( g );
    }

    this.DrawDescription( g );

    g.SetLineAttr( '#ddd', 1 );
    g.Frame();

  },

  DrawMousePos: function( g, x, y ) {
    var oldTrans = g.SelectTrans( 'viewport' );
    var txt = 'Pos = ' + Math.round(x) + ', ' + Math.round(y);
    g.SetTextAttr( 'Arial', 12, 'black', 'normal', 'normal', 'right', 'top', 2 );
    g.SetAreaAttr( 'white', 'white', 1 );
    var tx = g.VpInnerWidth - 3;
    var ty = g.VpInnerHeight / 2 - 3;
    g.TextBox( txt, tx, ty, 3 );
    g.Text( txt, tx, ty );
    g.SelectTrans( oldTrans );
  },

  DrawDescription: function( g ) {
    // all coordinates are with respect to a vieport of size 907x507

    var oldTrans = g.SelectTrans( 'viewport' );

    if (this.Description != '') {
      g.SetTextAttr( 'Arial', 16, 'black', 'normal', 'normal', 'center', 'bottom', 3 );
      g.SetAreaAttr( 'white', 'white', 1 );
      var tx = g.VpInnerWidth / 2;
      var ty = g.VpInnerHeight - 4;
      g.TextBox( this.Description, tx, ty, 3 );
      g.Text( this.Description, tx, ty );
    }

    if (this.PointerText != '') {
      g.SetAlpha( 0.5 );
      g.SetMarkerAttr( 'Arrow1', 16, 'gray', 'gray', 3 );
      var xFrom = this.PointerFrom[0] * g.VpInnerWidth / 907;
      var yFrom = this.PointerFrom[1] * g.VpInnerHeight / 507;
      var xTo = this.PointerTo[0] * g.VpInnerWidth / 907;
      var yTo = this.PointerTo[1] * g.VpInnerHeight / 507;
      g.Arrow( xFrom+1, yFrom+2, xTo+1, yTo+2 );
      g.SetAlpha( 1 );
      g.SetAreaAttr( 'red', 'red', 2 );
      g.Arrow( xFrom, yFrom, xTo, yTo );

      var txtpos = JsgVect2.Sub( this.PointerFrom, [0,4] );
      var txtHalign = 'bottom';
      var yoff = -4;
      if (yTo < yFrom) {
        txtHalign = 'top';
        yoff = 4;
      }
      g.SetTextAttr( 'Arial', 12, 'black', 'normal', 'normal', 'center', txtHalign, 3 );
      g.SetAreaAttr( 'gray', 'gray', 1 );
      g.SetAlpha( 0.5 );
      g.TextBox( this.PointerText, xFrom+1, yFrom+yoff+2, 3 );
      g.SetAlpha( 1 );
      g.SetAreaAttr( 'white', 'white', 1 );
      g.TextBox( this.PointerText, xFrom, yFrom+yoff, 3 );
      g.Text( this.PointerText, xFrom, yFrom+yoff );
    }

    g.SelectTrans( oldTrans );
  },

  DateTimeToString: function( dateTime ) {
    var monthNames = [ 'Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ];

    function num00( n ) {
      var s = Math.floor(n).toString();
      if (s.length < 2) s = '0' + s;
      return s;
    }

    var ms = (this.ZeroDate + dateTime) * this.msPerDay;
    var dateObj = new Date( ms );
    var year = dateObj.getUTCFullYear();
    var month = dateObj.getUTCMonth();
    var day = dateObj.getUTCDate();
    var hours = dateObj.getUTCHours();
    var minutes = dateObj.getUTCMinutes();

    var s = monthNames[month] + ' ' + num00(day) + ' ' + year + ' / ' + num00(hours) + ':' + num00(minutes) + ' UTC';
    if ((month == 2 && day == 20) || (month == 8 && day == 19)) {
      s = s + '|Equinox';
    }
    return s;
  },

  DrawDateTime: function( g ) {
    var oldTrans = g.SelectTrans( 'viewport' );
    var txt = this.DateTimeToString( this.DateTime );
    var txtl = txt.split( '|' );
    g.SetTextAttr( 'Arial', 12, 'black', 'normal', 'normal', 'right', 'top', 2 );
    g.SetAreaAttr( 'white', 'white', 1 );
    var tx = g.VpInnerWidth - 3;
    g.TextBox( txtl[0], tx, 3, 3 );
    g.Text( txtl[0], tx, 3 );
    if (txtl.length > 1) {
      g.TextBox( txtl[1], tx, 3+14, 3 );
      g.Text( txtl[1], tx, 3+14 );
    }
    g.SelectTrans( oldTrans );
   },

  DrawSunMoonAzimuthElevation: function( g ) {
    var oldTrans = g.SelectTrans( 'viewport' );
    g.SetTextAttr( 'Arial', 12, 'black', 'normal', 'normal', 'right', 'top', 2 );
    var tx = g.VpInnerWidth - 3;
    var ty = 36;
    var format = { Mode: 'fix0', Precision: 1 };
    if (this.SunFeCelestSphereCoord[2] > 0) {
      var txt =
        'Sun: azim = ' + NumFormatter.NumToString( this.SunAnglesGlobe.azimuth, format ) +
        ' / elev = ' + NumFormatter.NumToString( this.SunAnglesGlobe.elevation, format );
    } else {
      var txt = 'Sun: not visible';
    }
    g.TextBox( txt, tx, ty, 3 );
    g.Text( txt, tx, ty );
    ty += 14;
    if (this.MoonFeCelestSphereCoord[2] > 0) {
      var txt =
        'Moon: azim = ' + NumFormatter.NumToString( this.MoonAnglesGlobe.azimuth, format ) +
        ' / elev = ' + NumFormatter.NumToString( this.MoonAnglesGlobe.elevation, format );
    } else {
      var txt = 'Moon: not visible';
    }
    g.TextBox( txt, tx, ty, 3 );
    g.Text( txt, tx, ty );
    g.SelectTrans( oldTrans );
  },

  DrawMoonPhase: function( g ) {
    // This function draws the moon phase and orientation in the upped left corner.
    // It uses the relative positions of sun, earth and moon in the heliocentric model
    // to calculate the moon shadow in the heliocentric model.
    // Using the observer location on the globe, assuming the observer aims his camera
    // to the moon, keeping the camera vertical, the apparent orientation for the observer
    // is calculated and drawn. 
    //
    // Note: This function does not have any flat earth calculations at all. 
    // It only uses heliocentric and globe model values, transformations and calculations.

    // compute coloring of moon and background depending on its position

    if (this.MoonFeCelestSphereCoord[2] > 0) {
      // moon above horizon
      if (this.SunFeCelestSphereCoord[2] > 0) {
        // daytime
        var brightColor = '#bbf';
        var darkColor = '#22f';
      } else {
        // night
        var brightColor = '#fff';
        var darkColor = '#000';
      }
    } else {
      // moon below horizon
      if (this.SunFeCelestSphereCoord[2] > 0) {
        // daytime
        var brightColor = '#2a2';
        var darkColor = '#090';
      } else {
        // night
        var brightColor = '#151';
        var darkColor = '#030';
      }
    }

    // calculate direction of moon shadow in heliocentric (celestial) coordinates
    // from vectors between moon and sun and moon and earth in the heliocentric model

    var moonCelestPos = JsgVect3.Scale( this.MoonCelestCoord, this.DistMoon );
    var sunCelestPos = JsgVect3.Scale( this.SunCelestCoord, this.DistSun );
    var vectCelestMoonToGlobe = JsgVect3.Norm( JsgVect3.Scale( moonCelestPos, -1 ) );
    var vectCelestMoonToSun = JsgVect3.Norm( JsgVect3.Sub( sunCelestPos, moonCelestPos ) );
    var vectCelestMoonShadowUp = JsgVect3.Norm( JsgVect3.Mult( vectCelestMoonToSun, vectCelestMoonToGlobe ) );
    var vectCelestMoonShadowEast = JsgVect3.Norm( JsgVect3.Mult( vectCelestMoonShadowUp, vectCelestMoonToGlobe ) );

    // moon phase is determined by the vectors between moon/sun and moon/earth

    var moonPhase = Math.acos( Limit1( JsgVect3.ScalarProd( vectCelestMoonToSun, vectCelestMoonToGlobe ) ) );

    // transform the celestial direction to the moon into the globe coordinate system 
    // which depends on the orientation of the earth at current date/time and observer location

    var vectGlobeToMoon =  this.CelestCoordToLocalGlobeCoord( JsgVect3.Scale( vectCelestMoonToGlobe, -1 ) );

    // to calculate the moon phase orientation for the observer, 
    // we need the camera orientation on the globe model

    var camRight = JsgVect3.Mult( vectGlobeToMoon, [1, 0, 0 ] );
    if (JsgVect3.Length(camRight) == 0) {
      camRight = [ 0, 0, 1 ];
    } else {
      camRight = JsgVect3.Norm( camRight );
    }
    var camUp = JsgVect3.Mult( camRight, vectGlobeToMoon );

    // transform the heliocentric moon shadow direction to the 
    // local observer coordinate system on the globe

    var vectMoonShadowUp = this.CelestCoordToLocalGlobeCoord( vectCelestMoonShadowUp );
    var vectMoonShadowEast = this.CelestCoordToLocalGlobeCoord( vectCelestMoonShadowEast );

    // calculate the apparent moon phase orientation 
    // from the camera up vector and the direction of the shadow 
    // in the observers coordinate system.

    var moonRotation = Math.acos( Limit1( JsgVect3.ScalarProd( camUp, vectMoonShadowUp ) ) );
    if (JsgVect3.ScalarProd( vectMoonShadowUp, camRight ) > 0) {
      moonRotation *= -1;
    }

    // draw the moon in the upper left corner of the window
    // in the calculated moonRotation

    var d = (moonPhase / Math.PI * 8) % 16;
    g.SetViewport( 5, 5, g.CanvasWidth/14, g.CanvasWidth/14 );

    g.SetAreaAttr( darkColor, darkColor, 1 );
    g.Frame( 3 );

    g.SetWindow( -1.09, -1.09, 1.09, 1.09 );
    g.TransRotate( ToDeg( moonRotation ) );
    g.OpenPath();
    g.Circle( 0, 0, 1 );
    g.Clip();
    g.SetBgColor( brightColor );
    var rx = Math.abs( Math.cos( d / 8 * Math.PI ) );
    if (d >= 0 && d < 4) {
      g.SetBgColor( brightColor );
      g.Rect( -1, -1, 0, 1, 2 );
      g.SetBgColor( brightColor );
      g.Ellipse( 0, 0, rx, 1, 0, 2 );
    } else if (d >= 4 && d < 8) {
      g.SetBgColor( brightColor );
      g.Rect( -1, -1, 0, 1, 2 );
      g.SetBgColor( darkColor );
      g.Ellipse( 0, 0, rx, 1, 0, 2 );
    } else if (d >= 8 && d < 12) {
      g.SetBgColor( brightColor );
      g.Rect( 0, -1, 1, 1, 2 );
      g.SetBgColor( darkColor );
      g.Ellipse( 0, 0, rx, 1, 0, 2 );
    } else {
      g.SetBgColor( brightColor );
      g.Rect( 0, -1, 1, 1, 2 );
      g.SetBgColor( brightColor );
      g.Ellipse( 0, 0, rx, 1, 0, 2 );
    }
    g.SetAlpha( 1 );
    g.ResetTrans();
    g.SetViewport();
    g.SetClipping();

    if (true || this.MoonFeCelestSphereCoord[2] < 0) {
      // moon below horizon, label invisible
      var oldTrans = g.SelectTrans( 'viewport' );
      g.SetTextAttr( 'Arial', 12, 'black', 'normal', 'normal', 'center', 'top', 2 );
      g.SetAreaAttr( 'white', 'white', 1 );
      var tx = g.CanvasWidth/28 + 5;
      var ty = g.CanvasWidth/14 + 8;
      var txt = 'not visible';
var txt = (100*(1-moonPhase/Math.PI)).toFixed(1) + '%';
      g.TextBox( txt, tx, ty, 3 );
      g.Text( txt, tx, ty );
      g.SelectTrans( oldTrans );
    }
  },

  DrawObserver: function( g ) {
    // local globe coord: x -> up, y -> east, z -> north
    var me = this;
    function tfe( p ) {
      return me.LocalGlobeCoordToGlobalFeCoord( p );
    }
    var origin  = tfe( [ 0,    0,    0 ] );
    var north   = tfe( [ 0,    0,  500 ] );
    var east    = tfe( [ 0,  500,    0 ] );
    var south   = tfe( [ 0,    0, -500 ] );
    var west    = tfe( [ 0, -500,    0 ] );
    var corner1 = tfe( [ 0,  100,  100 ] );
    var corner2 = tfe( [ 0,  100, -100 ] );
    var corner3 = tfe( [ 0, -100, -100 ] );
    var corner4 = tfe( [ 0, -100,  100 ] );
    g.SetAreaAttr( 'red', 'black', 1 );
    g.NewPoly3D().AddPointToPoly3D(north).AddPointToPoly3D(corner1).AddPointToPoly3D(origin).AddPointToPoly3D(corner4);
    g.DrawPoly3D( 7 );
    g.SetAreaAttr( 'white', 'black', 1 );
    g.NewPoly3D().AddPointToPoly3D(east).AddPointToPoly3D(corner2).AddPointToPoly3D(origin).AddPointToPoly3D(corner1);
    g.DrawPoly3D( 7 );
    g.SetAreaAttr( 'blue', 'black', 1 );
    g.NewPoly3D().AddPointToPoly3D(south).AddPointToPoly3D(corner2).AddPointToPoly3D(origin).AddPointToPoly3D(corner3);
    g.DrawPoly3D( 7 );
    g.SetAreaAttr( 'white', 'black', 1 );
    g.NewPoly3D().AddPointToPoly3D(west).AddPointToPoly3D(corner3).AddPointToPoly3D(origin).AddPointToPoly3D(corner4);
    g.DrawPoly3D( 7 );

    g.SetAlpha( 0.5 );
    g.SetLineAttr( 'red', 1 );
    g.Line3D( this.ObserverFeCoord, [ 0, 0, 0 ] );
    g.SetAlpha( 1 );
  },

  DrawFeNightShadow: function( g ) {
    var transRotateToSun = JsgMat3.RotatingZ( ToRad(this.SunCelestAngle) );
    var transRotateToEarth = JsgMat3.RotatingZ( -ToRad(this.EarthRotAngle) );
    var maxDeltaLongDeg = 2.5;
    var dAngle = ToRad( 2.5 );
    var maxAngle = 2 * Math.PI + dAngle / 2;
    var sunAng = this.SunCelestAngle;
    g.NewPoly();
    for (var angle = 0; angle < maxAngle; angle += dAngle) {
      var pCircle = [ 0, Math.sin(angle), Math.cos(angle) ];
      var pCelest = JsgMat3.Trans( this.TransMatSunToCelest, JsgMat3.Trans( transRotateToSun, pCircle )  );
      var pEarth = JsgMat3.Trans( transRotateToEarth, pCelest );
      var latlong = this.CoordToLatLong( pEarth );
      g.AddPointToPoly( latlong.lat, latlong.lng );
    }
    // interpolate between holes in Poly(lat,long)
    var poly = g.Poly;
    var maxi = poly.Size - 2;
    g.NewPoly3D();
    for (var i = 0; i < maxi; i++) {
      var pFE = this.FeLatLongToGlobalFeCoord( poly.X[i], poly.Y[i] );
      g.AddPointToPoly3D( pFE );
      var longMin = poly.Y[i];
      var longMax = poly.Y[i+1];
      var diffLong = longMax - longMin;
      if (Math.abs(diffLong) > 180) {
        // bridge over 180 to -180
        if (longMin < longMax) {
          longMin += 360;
        } else {
          longMax += 360;
        }
        diffLong = longMax - longMin;
      }
      if (Math.abs(diffLong) > maxDeltaLongDeg && poly.X[i] < 10) {
        // add interpolated points
        var nPoints = Math.floor( Math.abs(diffLong) / maxDeltaLongDeg );
        var dLong = diffLong / (nPoints + 1);
        var firstLong = longMin + dLong;
        var maxLong = longMax - dLong / 2;
        var lat1 = poly.X[i];
        var lat2 = poly.X[i+1];
        for (var long = firstLong; (dLong > 0) ? long < maxLong : long > maxLong; long += dLong) {
          var paramLong = (long - longMin) / diffLong; // 0..1
          var lat = paramLong * (lat2 - lat1) + lat1;
          var longInRange = long;
          if (longInRange > 180) longInRange -= 360;
          var pFE = this.FeLatLongToGlobalFeCoord( lat, longInRange );
          g.AddPointToPoly3D( pFE );
        }
      }
    }
    var pFE = this.FeLatLongToGlobalFeCoord( poly.X[maxi+1], poly.Y[maxi+1] );
    g.AddPointToPoly3D( pFE );

    g.SetAreaAttr( 'gray', 'gray', 1 );
    g.SetAlpha( 0.35 );
    var sunCelestAngleRange = ToRange( this.SunCelestAngle, 360 );
    if (sunCelestAngleRange >= 0 && sunCelestAngleRange <= 180) {
      g.OpenPath3D();
      g.CircleOnPlane( 0, 0, this.RadiusFE );
      g.DrawPoly3D();
      g.Path3D( 3 );
    } else {
      g.DrawPoly3D( 3 );
    }
    g.SetAlpha( 1 );
  },

  DrawObjRays: function( g, objCelestCoord, objDomeCoord ) {
    // draw sun rays to many points on FE
    var dLat = 30;
    if (this.ShowManyRays) dLat /= 2;
    var latMin = -90;
    var latMax = 90 + dLat / 2;
    var latOff = 0.1;
    var dLong = 15;
    if (this.ShowManyRays) dLong /= 2;
    var longMin = 0;
    var longMax = 360 - dLong / 2;
    for (var lat = latMin; lat < latMax; lat += dLat) {
      for (var long = longMin; long < longMax; long += dLong) {
        g.SetLineAttr( this.StarColorFromLatLong(lat,long), 1 );
        if (lat > 89) latOff = 0;
        this.DrawObjRayToFeTarget( g, objCelestCoord, objDomeCoord, lat+latOff, long );
        if (lat > 89) break;
      }
    }
  },

  DrawSunRays: function( g ) {
    if (this.RayTarget == 0 && !this.ShowStars) {

      // one ray between sun and observer
      this.DrawSunRayToObserver( g );

    } else if (this.RayTarget == 1 && this.RaySource == 0) {

      // draw sun rays to many points on FE
      this.DrawObjRays( g, this.SunCelestCoord, this.SunDomeCoord );

    }
  },

  DrawMoonRays: function( g ) {
    if (this.RayTarget == 0 && !this.ShowStars) {

      // one ray between moon and observer
      this.DrawMoonRayToObserver( g );

    } else if (this.RayTarget == 1 && this.RaySource == 1) {

      // draw moon rays to many points on FE
      this.DrawObjRays( g, this.MoonCelestCoord, this.MoonDomeCoord );

    }
  },

  DrawStarsRays: function( g ) {

    if (this.RayTarget == 0 && this.ShowStars && (this.ShowDomeRays || this.ShowSphereRays)) {

      // one rays between stars and observer
      this.DrawStarRaysToObserver( g, 6, 12 );

    } else if (this.RayTarget == 1 && this.RaySource == 2) {

      // draw rays from 1 star to many points on FE
      // lat and long of observer determines the star position

      var starCelestCoord = this.LatLongToCoord( this.ObserverLat, this.ObserverLong, 1 );
      var starDomeCoord = this.CelestLatLongToDomeCoord( this.ObserverLat, this.ObserverLong );
      this.DrawObjRays( g, starCelestCoord, starDomeCoord );

      // draw star dome latitude
      g.SetAlpha( 0.7 );
      g.SetLineAttr( '#f80', 1 );
      this.DrawDomeLatitudeLine( g, this.ObserverLat );

      // draw single big star
      var starGlobalFeCoord = this.DomeCoordToGlobalFeCoord( starDomeCoord );
      g.SetMarkerAttr( 'Star6', 16, 'black', 'yellow', 1 );
      g.Marker3D( starGlobalFeCoord, 3 );
      g.SetAlpha( 1 );

    }
  },

  DrawStarRaysToObserver: function( g, nLat, nLong ) {
    // at the northpole only one single star is drawn,
    // no southpole star can be drawn, because its position is everywhere on the -90 degree,
    // so enstead a row of stars is drawn at some -90 + degrees

    var dLatDeg = 180 / nLat;
    var maxLatDeg = 90 - dLatDeg / 2;
    var dLongDeg = 360 / nLong;
    if (!this.ShowManyRays) dLongDeg *= 4;
    var maxLongDeg = 360 - dLongDeg / 2;

    for (var latDeg = -90; latDeg < maxLatDeg; latDeg += dLatDeg) {
      var latCorrectedDeg = latDeg;
      if (latDeg == -90) latCorrectedDeg += 5;
      for (var longDeg = 0; longDeg < maxLongDeg; longDeg += dLongDeg) {
        var lineWidth = this.StarSizeFromLong(longDeg);
        if (!this.ShowManyRays) lineWidth = 1;
        g.SetLineAttr( this.StarColorFromLatLong(latDeg,longDeg), lineWidth );
        this.DrawStarRay( g, latCorrectedDeg, longDeg );
      }
    }

    // draw polaris
    g.SetLineAttr( this.StarColorFromLatLong(90,0), 2 );
    this.DrawStarRay( g, 90, 0 );
  },

  DrawObjRayToFeTarget: function( g, objCelestCoord, objDomeCoord, targetLat, targetLong ) {

    var targetGlobalFeCoord = this.FeLatLongToGlobalFeCoord( targetLat, targetLong );
    var matCelestToGlobe = this.CompTransMatCelestToGlobe( targetLat, targetLong );
    var matLocalFeToGlobalFe = this.CompTransMatLocalFeToGlobalFe( targetGlobalFeCoord, targetLong );

    // if shadow is drawn don't draw rays of stars in day part of the FE
    if (this.RaySource == 2 && this.ShowShadow) {
      var sunLocalGlobeCoord = JsgMat3.Trans( matCelestToGlobe, this.SunCelestCoord );
      var sunLocalFeSphereCoord = this.LocalGlobeCoordToLocalFeCoord( JsgVect3.Scale( sunLocalGlobeCoord, this.RadiusSphere ) );
      var sunGlobalFeSphereCoord = JsgMat3.Trans( matLocalFeToGlobalFe, sunLocalFeSphereCoord );
      if (sunGlobalFeSphereCoord[2] >= 0) return;
    }

    var objLocalGlobeCoord = JsgMat3.Trans( matCelestToGlobe, objCelestCoord );
    var objLocalFeSphereCoord = this.LocalGlobeCoordToLocalFeCoord( JsgVect3.Scale( objLocalGlobeCoord, this.RadiusSphere ) );
    var objGlobalFeSphereCoord = JsgMat3.Trans( matLocalFeToGlobalFe, objLocalFeSphereCoord );

    if (objGlobalFeSphereCoord[2] < 0) return;

    // object is above the horizon, compute bezier curve
    var objGlobalFeCoord = this.DomeCoordToGlobalFeCoord( objDomeCoord );
    var cpLength = JsgVect3.Length( JsgVect3.Sub( objGlobalFeCoord, targetGlobalFeCoord ) ) * this.RayParameter / 3;
    var controlPointLocalFeCoord = this.LocalGlobeCoordToLocalFeCoord( JsgVect3.Scale( objLocalGlobeCoord, cpLength ) );
    var controlPointGlobalFeCoord = JsgMat3.Trans( matLocalFeToGlobalFe, controlPointLocalFeCoord );
    g.BezierCurve3D( targetGlobalFeCoord, controlPointGlobalFeCoord, objGlobalFeCoord, objGlobalFeCoord, 1 );
  },

  DrawSunRayToObserver: function( g ) {
      var sunFeCoord = this.DomeCoordToGlobalFeCoord( this.SunDomeCoord );
      var cpLength = JsgVect3.Length( JsgVect3.Sub( sunFeCoord, this.ObserverFeCoord ) ) * this.RayParameter / 3;
      var controlPointFeCoord = this.LocalGlobeCoordToGlobalFeCoord( JsgVect3.Scale( this.SunLocalGlobeCoord, cpLength ) );

      if (this.SunFeCelestSphereCoord[2] > 0) {
        if (this.ShowSphereRays) {
          // sphere sun ray
          g.SetLineAttr( 'darkorange', 1 );
          g.Line3D( this.ObserverFeCoord, this.SunFeCelestSphereCoord );
        }
        if (this.ShowSphere) {
          // sphere sun
          g.SetMarkerAttr( 'Circle', 8, 'orange', 'white', 1 );
          g.Marker3D( this.SunFeCelestSphereCoord );
        }
        if (this.ShowDomeRays) {
          // dome sun ray
          g.SetAlpha( 0.5 );
          g.SetLineAttr( 'white', 5 );
          g.BezierCurve3D( this.ObserverFeCoord, controlPointFeCoord, sunFeCoord, sunFeCoord, 1 );
          g.SetAlpha( 1 );
          g.SetLineAttr( 'orange', 1.5 );
          g.BezierCurve3D( this.ObserverFeCoord, controlPointFeCoord, sunFeCoord, sunFeCoord, 1 );
          g.SetAlpha( 1 );
        }
      }
  },

  DrawMoonRayToObserver: function( g ) {
    var moonGlobalFeCoord = this.DomeCoordToGlobalFeCoord( this.MoonDomeCoord );
    var cpLength = JsgVect3.Length( JsgVect3.Sub( moonGlobalFeCoord, this.ObserverFeCoord ) ) * this.RayParameter / 3;
    var controlPointGlobalFeCoord = this.LocalGlobeCoordToGlobalFeCoord( JsgVect3.Scale( this.MoonLocalGlobeCoord, cpLength ) );

    if (this.MoonFeCelestSphereCoord[2] > 0) {
      if (this.ShowSphereRays) {
        // sphere moon ray
        g.SetLineAttr( '#666', 1 );
        g.Line3D( this.ObserverFeCoord, this.MoonFeCelestSphereCoord );
      }
      if (this.ShowSphere) {
        // sphere moon
        g.SetMarkerAttr( 'Circle', 8, '#888', 'white', 1 );
        g.Marker3D( this.MoonFeCelestSphereCoord );
      }
      if (this.ShowDomeRays) {
        // dome moon ray
        g.SetAlpha( 0.5 );
        g.SetLineAttr( 'white', 4 );
        g.BezierCurve3D( this.ObserverFeCoord, controlPointGlobalFeCoord, moonGlobalFeCoord, moonGlobalFeCoord, 1 );
        g.SetAlpha( 1 );
        g.SetLineAttr( '#aaa', 1.5 );
        g.BezierCurve3D( this.ObserverFeCoord, controlPointGlobalFeCoord, moonGlobalFeCoord, moonGlobalFeCoord, 1 );
        g.SetAlpha( 1 );
      }
    }
  },

  DrawSunTrack: function( g ) {
    // draw track
    var sunLatLong;
    var dSunAngDeg = 5;
    var maxSunAngDeg = 360 + dSunAngDeg / 2;
    g.NewPoly3D();
    for (var sunAngDeg = 0; sunAngDeg < maxSunAngDeg; sunAngDeg += dSunAngDeg) {
      var sunDomeCoord = this.CelestCoordToDomeCoord( this.SunAngleToCelestCoord( sunAngDeg ) );
      g.AddPointToPoly3D( sunDomeCoord );
    }
    g.SetAlpha( 0.25 );
    g.SetLineAttr( 'red', 2 );
    g.DrawPoly3D();

    // draw intersecton knots with ecliptic and solstice points
    g.SetAlpha( 0.5 );
    g.SetMarkerAttr( 'Circle', 5, 'black', 'red', 1 );
    var dSunAngDeg = 90;
    var maxSunAngDeg = 360 - dSunAngDeg / 2;
    for (var sunAngDeg = 0; sunAngDeg < maxSunAngDeg; sunAngDeg += dSunAngDeg) {
      var sunDomeCoord = this.CelestCoordToDomeCoord( this.SunAngleToCelestCoord( sunAngDeg ) );
      g.Marker3D( sunDomeCoord, 3 );
    }
    g.SetAlpha( 1 );
  },

  DrawMoonTrack: function( g ) {
    // draw track
    var dMoonAngDeg = 5;
    var maxMoonAngDeg = 360 + dMoonAngDeg / 2;
    g.NewPoly3D();
    for (var moonAngDeg = 0; moonAngDeg < maxMoonAngDeg; moonAngDeg += dMoonAngDeg) {
      var moonDomeCoord = this.CelestCoordToDomeCoord( this.MoonAngleToCelestCoord( moonAngDeg ) );
      g.AddPointToPoly3D( moonDomeCoord );
    }
    g.SetAlpha( 0.25 );
    g.SetLineAttr( 'green', 2 );
    g.DrawPoly3D();

    // draw intersection knots with sun track (ecliptic)
    g.SetAlpha( 0.5 );
    g.SetMarkerAttr( 'Circle', 5, 'black', 'green', 1 );
    var dMoonAngDeg = 180;
    var maxMoonAngDeg = 360 - dMoonAngDeg / 2;
    for (var moonAngDeg = 0; moonAngDeg < maxMoonAngDeg; moonAngDeg += dMoonAngDeg) {
      var moonDomeCoord = this.CelestCoordToDomeCoord( this.MoonAngleToCelestCoord( moonAngDeg ) );
      g.Marker3D( moonDomeCoord, 3 );
    }
    g.SetAlpha( 1 );
  },

  DrawDomeGrid: function( g, nLat, nLong ) {
    // draw longitudes
    var dLongDeg = 360 / nLong;
    var maxLongDeg = 360 - dLongDeg / 2;
    for (var longDeg = 0; longDeg < maxLongDeg; longDeg += dLongDeg) {
      this.DrawDomeLongitudeLine( g, longDeg );
    }

    // draw latitudes
    var dLatDeg = 180 / nLat;
    var maxLatDeg = 90 - dLatDeg / 2;
    for (var latDeg = -90; latDeg < maxLatDeg; latDeg += dLatDeg) {
      this.DrawDomeLatitudeLine( g, latDeg );
    }
  },

  DrawFeCelestSphereStars: function( g, nLat, nLong ) {
    // at the northpole only one single star is drawn,
    // no southpole star can be drawn, because its position is everywhere on the -90 degree,
    // so enstead a row of stars is drawn at some -90 + degrees

    var baseMarkerSize = 6;
    var addMarkerSize = 3 + 3 * ((this.Zoom-1)/10);
    g.SetMarkerAttr( 'Star4', baseMarkerSize, 'black', 'yellow', 1 );

    var dLatDeg = 180 / nLat;
    var maxLatDeg = 90 - dLatDeg / 2;
    var dLongDeg = 360 / nLong;
    var maxLongDeg = 360 - dLongDeg / 2;

    for (var latDeg = -90; latDeg < maxLatDeg; latDeg += dLatDeg) {
      var latCorrectedDeg = latDeg;
      if (latDeg == -90) latCorrectedDeg += 5;
      for (var longDeg = 0; longDeg < maxLongDeg; longDeg += dLongDeg) {
        g.SetAreaAttr( 'black', this.StarColorFromLatLong(latDeg,longDeg), 1 );
        g.SetMarkerSize( (this.StarSizeFromLong(longDeg)-1) * addMarkerSize + baseMarkerSize );
        this.DrawFeCelestSphereStar( g, latCorrectedDeg, longDeg );
      }
    }

    // draw polaris
    g.SetAreaAttr( 'black', this.StarColorFromLatLong(90,0), 1 );
    g.SetMarkerSize( addMarkerSize + baseMarkerSize );
    this.DrawFeCelestSphereStar( g, 90, 0 );
  },

  StarColorFromLatLong: function( lat, long ) {
    var hue = 1 - (ToRange( lat+90, 180 ) / 180);
    return JsgColor.HSV( hue, 1, 1, 1 );
  },

  StarSizeFromLong: function( long ) {
    var longRange = ToRange( long, 120 );
    var size = 1;
    if (longRange < 1 || longRange > 119) size = 2;
    return size;
  },

  DrawDomeStars: function( g, nLat, nLong ) {
    // at the northpole only one single star is drawn,
    // no southpole star can be drawn, because its position is everywhere on the -90 degree,
    // so enstead a row of stars is drawn at some -90 + degrees

    var baseMarkerSize = 8;
    var addMarkerSize = 4 + 4 * ((this.Zoom-1)/10);
    g.SetMarkerAttr( 'Star5', baseMarkerSize, 'black', 'yellow', 1 );

    var dLatDeg = 180 / nLat;
    var maxLatDeg = 90 - dLatDeg / 2;
    var dLongDeg = 360 / nLong;
    var maxLongDeg = 360 - dLongDeg / 2;

    for (var latDeg = -90; latDeg < maxLatDeg; latDeg += dLatDeg) {
      var latCorrectedDeg = latDeg;
      if (latDeg == -90) latCorrectedDeg += 5;
      for (var longDeg = 0; longDeg < maxLongDeg; longDeg += dLongDeg) {
        var starSphereCoord = this.CelestLatLongToGlobalFeSphereCoord( latCorrectedDeg, longDeg, this.RadiusSphere );
        if (starSphereCoord[2] > 0) {
          g.SetAlpha( 1 );
        } else {
          g.SetAlpha( 0.3 );
        }
        g.SetMarkerSize( (this.StarSizeFromLong(longDeg)-1) * addMarkerSize + baseMarkerSize );
        g.Marker3D( this.CelestLatLongToDomeCoord( latCorrectedDeg, longDeg ), 3 );
      }
    }

    // draw polaris
    var starSphereCoord = this.CelestLatLongToGlobalFeSphereCoord( 90, 0, this.RadiusSphere );
    if (starSphereCoord[2] > 0) {
      g.SetAlpha( 1 );
    } else {
      g.SetAlpha( 0.3 );
    }
    g.SetMarkerSize( addMarkerSize + baseMarkerSize );
    g.Marker3D( this.CelestLatLongToDomeCoord( 90, 0 ), 3 );
    g.SetAlpha( 1 );
  },

  DrawFeCelestSphereStar: function( g, latDeg, longDeg ) {
    var starSphereCoord = this.CelestLatLongToGlobalFeSphereCoord( latDeg, longDeg, this.RadiusSphere );
    if (starSphereCoord[2] > 0) {
      // g.Line3D( this.ObserverFeCoord, starSphereCoord );
      g.Marker3D( starSphereCoord, 3 );
    }
  },

  DrawStarRay: function( g, latDeg, longDeg ) {
    var starSphereCoord = this.CelestLatLongToGlobalFeSphereCoord( latDeg, longDeg, this.RadiusSphere );
    var starDomeCoord = JsgMat3.Trans( this.TransMatEarthRot, this.CelestLatLongToDomeCoord( latDeg, longDeg ) );
    var cpLength = JsgVect3.Length( JsgVect3.Sub( starDomeCoord, this.ObserverFeCoord ) ) * this.RayParameter / 3;
    var pBezierControl = this.CelestLatLongToGlobalFeSphereCoord( latDeg, longDeg, cpLength );

    if (starSphereCoord[2] > 0) {
      if (this.ShowSphereRays) {
        g.SetAlpha( 0.5 );
        g.Line3D( this.ObserverFeCoord, starSphereCoord );
        g.SetAlpha( 1 );
      }
      if (this.ShowDomeRays) {
        g.BezierCurve3D( this.ObserverFeCoord, pBezierControl, starDomeCoord, starDomeCoord, 1 );
      }
    }
  },

  DrawDomeOutline: function( g, nLong ) {
    if (this.DomeSize <= 1.0001) return;

    var maxLatRad = Math.acos( 1 / this.DomeSize );
    var dLongDeg = 360 / nLong;
    var maxLongDeg = 360 - dLongDeg / 2;
    for (var longDeg = 0; longDeg < maxLongDeg; longDeg += dLongDeg) {
      this.DrawDomeLongitudeOutline( g, longDeg, maxLatRad );
    }

    g.CircleOnPlane( 0, 0, this.DomeSize*this.RadiusFE, 1 );
  },

  DrawDomeLongitudeOutline: function( g, longDeg, aMaxRad ) {
    // aMaxRad as angle from ground = 0 to zenith = PI/2
    function addDomePoint( lat ) {
      var r = domeRadius * Math.cos( lat );
      var x = r * cosLong;
      var y = r * sinLong;
      var z = domeHeight * Math.sin( lat );
      g.AddPointToPoly3D( x, y, z );
    }

    g.NewPoly3D();
    var domeRadius = this.DomeSize * this.RadiusFE;
    var domeHeight = this.DomeHeight;
    var longRad = ToRad( longDeg );
    var cosLong = Math.cos( longRad );
    var sinLong = Math.sin( longRad );
    var dLatRad = ToRad( 5 );
    var maxLatRad = aMaxRad - dLatRad / 2;
    for (var latRad = 0; latRad < maxLatRad; latRad += dLatRad) {
      addDomePoint( latRad );
    }
    addDomePoint( aMaxRad );
    g.DrawPoly3D();
  },

  DrawDomeLongitudeLine: function( g, longDeg ) {
    var dLatDeg = 2.5;
    var maxLatDeg = 90 + dLatDeg / 2;
    g.NewPoly3D();
    for (var latDeg = -90; latDeg < maxLatDeg; latDeg += dLatDeg) {
      g.AddPointToPoly3D( this.CelestLatLongToDomeCoord( latDeg, longDeg ) );
    }
    g.DrawPoly3D();
  },

  DrawDomeLatitudeLine: function( g, latDeg ) {
    if (latDeg >= 90) return;
    var dLongDeg = 5;
    var maxLongDeg = 360 + dLongDeg / 2;
    g.NewPoly3D();
    for (var longDeg = 0; longDeg < maxLongDeg; longDeg += dLongDeg) {
      g.AddPointToPoly3D( this.CelestLatLongToDomeCoord( latDeg, longDeg ) );
    }
    g.DrawPoly3D();
  },

  DrawFeCelestSphere: function( g ) {
    // draws celestial sphere at observion position of flat earth

    // grid below surface is clipped and grid facing away is dimmer, by drawing the front part twice using clipping
    // surface clip plane
    g.AddClipPlane( [0,0,0], [1,0,0], [0,1,0] );

    // draw grid
    g.SetLineAttr( 'black', 1 );
    g.SetAlpha( 0.15 );
    this.DrawFeCelestSphereGrid( g );

    var vecObsToCam = JsgVect3.Norm( JsgVect3.Sub( g.Camera.CamPos, this.ObserverFeCoord ) );
    var vecInPlane = JsgVect3.Norm( JsgVect3.Mult( [0,0,1], vecObsToCam ) );
    var vecUp = JsgVect3.Norm( JsgVect3.Mult( vecObsToCam, vecInPlane ) );
    g.AddClipPlane( this.ObserverFeCoord, vecInPlane, vecUp );

    // draw grid second time clipped to front
    g.SetAlpha( 0.2 );
    this.DrawFeCelestSphereGrid( g );
    // draw equator
    g.SetAlpha( 0.5 );
    this.DrawFeCelestSphereLatLine( g, 0 );

    // reset clipping to surface clipping only
    g.DeleteClipPlanes();
    g.AddClipPlane( [0,0,0], [1,0,0], [0,1,0] );

    // draw sun path
    if (!this.ShowStars) {
      g.SetAlpha( 1 );
      g.SetLineAttr( 'orange', 1 );
      this.DrawFeCelestSphereLatLine( g, this.SunCelestLatLong.lat );

      // draw moon path
      g.SetLineAttr( 'green', 1 );
      this.DrawFeCelestSphereLatLine( g, this.MoonCelestLatLong.lat );

      // draw axes
      g.SetLineAttr( 'blue', 1 );
      g.Line3D( this.ObserverFeCoord, this.CelestLatLongToGlobalFeSphereCoord( -90, 0, this.RadiusSphere ) );
      g.SetLineAttr( 'red', 1 );
      g.Line3D( this.ObserverFeCoord, this.CelestLatLongToGlobalFeSphereCoord(  90, 0, this.RadiusSphere ) );
    }

    // draw base circle
    g.DeleteClipPlanes();
    g.SetLineAttr( 'black', 1 );
    this.DrawGlobalFeCircle( g, this.ObserverFeCoord, this.RadiusSphere, 1 );
    g.SetAlpha( 1 );
  },

  DrawGlobalFeCircle: function( g, pos, radius, mode ) {
    var oldPlane = g.Plane;
    g.SetPlane( this.DefaultPlane );
    g.CircleOnPlane( pos, radius, mode );
    g.SetPlane( oldPlane );
  },

  DrawFeCelestSphereGrid: function( g ) {
    // draw latitude lines
    var dLatDeg = 15;
    var maxLatDeg = 90 - dLatDeg / 2;
    for (var latDeg = -90+dLatDeg; latDeg < maxLatDeg; latDeg += dLatDeg) {
      this.DrawFeCelestSphereLatLine( g, latDeg );
    }
    // draw longitude lines
    var dLongDeg = 15;
    var maxLongDeg = 360 - dLongDeg / 2;
    for (var longDeg = 0; longDeg < maxLongDeg; longDeg += dLongDeg) {
      this.DrawFeCelestSphereLongLine( g, longDeg );
    }
  },

  DrawFeCelestSphereLatLine: function( g, latDeg ) {
    var dLongDeg = 5;
    var maxLongDeg = 180 + dLongDeg / 2;
    g.NewPoly3D();
    for (var longDeg = -180; longDeg < maxLongDeg; longDeg += dLongDeg) {
      g.AddPointToPoly3D( this.CelestLatLongToGlobalFeSphereCoord( latDeg, longDeg, this.RadiusSphere ) );
    }
    g.DrawPoly3D();
  },

  DrawFeCelestSphereLongLine: function( g, longDeg ) {
    var dLatDeg = 5;
    var maxLatDeg = 90 + dLatDeg / 2;
    g.NewPoly3D();
    for (var latDeg = -90; latDeg < maxLatDeg; latDeg += dLatDeg) {
      g.AddPointToPoly3D( this.CelestLatLongToGlobalFeSphereCoord( latDeg, longDeg, this.RadiusSphere ) );
    }
    g.DrawPoly3D();
  },

};

var UpdateAllRunning = false;

function UpdateAll( stopAnimation, callUpdateUrl ) {
  if (UpdateAllRunning) return;
  UpdateAllRunning = true;
  try {
    stopAnimation = xDefBool( stopAnimation, true );
    callUpdateUrl = xDefBool( callUpdateUrl, true );
    if (stopAnimation) {
      Demos.Reset();
      FeDomeApp.ClearDescription();
    }
    FeDomeApp.Update();
    ControlPanels.Update();
    FeDomeApp.Draw();
    if (callUpdateUrl) UpdateUrl();
  }
  finally {
    UpdateAllRunning = false;
  }
}

function ResetApp() {
  Demos.Reset( false );
  DataX.JsonToAppState(
    'FeDomeApp = { "Description": "", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": 0, "ObserverLong": 15, "Zoom": 1.4, "CameraDirection": 30, "CameraHeight": 25, "CameraDistance": 200150, "DateTime": 82.5, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": true, "ShowShadow": true, "ShowDomeGrid": true, "ShowSunTrack": false, "ShowMoonTrack": false, "ShowSphere": true, "ShowStars": false, "ShowDomeRays": true, "ShowSphereRays": true, "ShowManyRays": false }' );
  UpdateAll( true, false );
  UpdateUrl( true );
  Demos.UpdateDemoPanels();
}

xOnLoad(
  function() {
    HandleUrlCommands();
    UpdateAll( false, false );
  }
);

DataX.AssignSaveRestoreDomObj( 'SaveRestorePanel' );
DataX.AssignApp( 'FeDomeApp', FeDomeApp, FeDomeAppMetaData, ResetApp, function(){ UpdateAll(true,true); } );
DataX.SetupUrlStateHandler( 'App' );

function HandleUrlCommands() {

  Animations.TimeStrech = 1 / DataX.GetUrlNum( 'speed', 1 );
  if (Animations.TimeStrech < 0.01) Animations.TimeStrech = 0.01;
  if (Animations.TimeStrech > 100) Animations.TimeStrech = 100;

  var dataStr = DataX.GetUrlStr( 'demo' );
  if (dataStr != '') {
    location.hash = "#App";
    var play = false;
    var pos = DataX.GetUrlInt( 'pos', 0 );
    if (pos == 0) {
      pos = DataX.GetUrlInt( 'play', 0 );
      play = pos > 0;
    }
    if (pos > 0) {
      pos--;
      setTimeout(
        function() {
          Demos.SetDemo( dataStr, play, pos );
        }, 1000
      );
    } else {
      setTimeout(
        function() {
          Demos.Play( dataStr, true );
        }, 1000
      );
    }
    return;
  }

}


// save and restore app state from browser history

var UpdateUrlTimer = null;

function UpdateUrl( clear ) {
  if (UpdateUrlTimer) {
    clearTimeout( UpdateUrlTimer );
    UpdateUrlTimer = null;
  }
  if (clear) {
    history.pushState( { data: '' }, '', ThisPageShortUrl );
  } else {
    UpdateUrlTimer = setTimeout( SaveStateToBrowserHistory, 2000 );
  }
}

function SaveStateToBrowserHistory() {
  if (UpdateUrlTimer) {
    clearTimeout( UpdateUrlTimer );
    UpdateUrlTimer = null;
  }

  var dataStr = DataX.AppStateToStream( true );
  var url = DataX.StreamToUrl( ThisPageShortUrl, dataStr );
  history.pushState( { data: dataStr }, '', url );
}

function OnUrlChange( e ) {
  if (!e.state || !e.state.data) return;
  Demos.Reset( false );
  DataX.StreamToAppState( e.state.data, false );
  UpdateAll( false, false );
}

window.addEventListener( 'popstate', OnUrlChange, false );


/* Demos Manager */

var AnimationSpeed = 1;  // > 0

var Demos = {
  DemoList: [],
  CurrDemo: null,
  LastDemo: null,
  SusDemo: null,
  SusState: 0,
  CurrModAnim: null,
  CurrAnimStep: 0,
  NewCustomDemoName: '',  // custom demos may have a different name then the demo button
  OnStopFunc: null,

  Init: function() {
    // installed demo button click handlers
    var nDemos = this.DemoList.length;
    for (var i = 0; i < nDemos; i++) {
      this.AddButtonClickHandler( i );
    }
  },

  AddButtonClickHandler: function( id ) {
    // id as DemoList index or demo name
    if (xStr(id)) id = this.Find(id);
    var demoName = this.DemoList[id].Name;
    Tabs.AddButtonClickHandler( 'DomeDemoTabs', demoName + 'Button',
      function( buttonData, event ) {
        if (Demos.IsCurrDemoName(demoName) && Demos.IsPlaying()) {
          Demos.Next( false, !Demos.IsTargetIsEndPos() );
        } else {
          Demos.Play( demoName, true );
        }
      }
    );
  },

  SetButtonText: function( text, button ) {
    button = xDefStr( button, 'Custom' );
    var buttonName = button + 'Button';
    xRemoveClass( buttonName, 'TabHide' );
    xInnerHTML( buttonName, text );
    this.NewCustomDemoName = text;
  },

  Reset: function( callOnStop ) {
    callOnStop = xDefBool( callOnStop, true );
    this.Stop( false );
    this.LastDemo = this.CurrDemo;
    if (this.CurrDemo) {
      this.SusDemo = this.CurrDemo;
      this.SusState = this.CurrDemo.Anim.CurrState;
    }
    this.CurrDemo = null;
    this.UpdateDemoPanels();
    if (this.callOnStop && this.OnStopFunc) this.OnStopFunc();
  },

  Find: function( name ) {
    var nDemos = this.DemoList.length;
    for (var i = 0; i < nDemos; i++) {
      if (this.DemoList[i].Name == name || this.DemoList[i].Name2 == name) return i;
    }
    return -1;
  },

  UpdateDemoPanels: function() {
    if (this.LastDemo) {
      xRemoveClass( this.LastDemo.Name + 'Button', 'TabActive' );
      this.LastDemo = null;
    }
    if (this.CurrDemo) {
      xAddClass( 'BackButton', 'TabEnabled' );
      xAddClass( 'PlayButton', 'TabEnabled' );
      xAddClass( 'ForwButton', 'TabEnabled' );
      xAddClass( 'CountButton', 'TabEnabled' );
      if (this.IsPlaying()) {
        xInnerHTML( 'PlayButton', 'Stop' );
        xAddClass( 'PlayButton', 'TabActive' );
      } else {
        xInnerHTML( 'PlayButton', 'Play' );
        xRemoveClass( 'PlayButton', 'TabActive' );
      }
      var pos = this.GetCurrPos() + 1;
      if (this.IsEndPos()) {
        pos = 'end';
      } else {
        pos = pos.toFixed(0);
      }
      xInnerHTML( 'CountButton', pos );
      xAddClass( this.CurrDemo.Name + 'Button', 'TabActive' );
    } else {
      if (this.SusDemo) {
        xInnerHTML( 'PlayButton', 'Resume' );
        xAddClass( 'PlayButton', 'TabEnabled' );
        xAddClass( 'PlayButton', 'TabActive' );
        xInnerHTML( 'CountButton', (this.SusState+1).toFixed(0) );
      } else {
        xInnerHTML( 'PlayButton', 'Play' );
        xInnerHTML( 'CountButton', 'x' );
        xRemoveClass( 'PlayButton', 'TabEnabled' );
      }
      xRemoveClass( 'CountButton', 'TabEnabled' );
      xRemoveClass( 'BackButton', 'TabEnabled' );
      xRemoveClass( 'ForwButton', 'TabEnabled' );
    }
  },

  New: function( name ) {
    // returns ModelAnimation
    var anim = NewModelAnimation( {
      ModelRef: FeDomeApp,
      OnModelChange: function(){ UpdateAll( false, false ); },
      PauseTime: 0,
      OnAfterStateChange: function( anim, state ) { Demos.UpdateDemoPanels(); },
      OnStopPlaying: function( anim, state ){
        Demos.UpdateDemoPanels();
        if (Demos.OnStopFunc) Demos.OnStopFunc();
      }
    } );
    var demo = {
      Name: name,
      Name2: this.NewCustomDemoName,
      Anim: anim,
    };
    this.NewCustomDemoName = '';
    var i = this.Find( name );
    if (i >= 0) {
      this.DemoList[i] = demo;
    } else {
      this.DemoList.push( demo );
    }
    this.CurrModAnim = anim;
    this.CurrAnimStep = 0;
    return anim;
  },

  AddState: function( jsonState ) {
    var anim = this.CurrModAnim;
    if (!anim) return;
    anim.OnSetState( this.CurrAnimStep,
      function() {
        // prevent setting state for inactive demos
        if (Demos.CurrDemo && Demos.CurrDemo.Anim == anim) {
          DataX.JsonToAppState( jsonState );
        }
      }
    );
    this.CurrAnimStep++;
  },

  AddAnimation: function( animDef ) {
    var anim = this.CurrModAnim;
    if (!anim) reurn;
    anim.AnimationToState( this.CurrAnimStep, animDef );
  },

  IsActive: function() {
    return this.CurrDemo != null;
  },

  IsCurrDemoName: function( name ) {
    if (!this.CurrDemo) return false;
    return this.CurrDemo.Name == name;
  },

  IsPlaying: function() {
    if (!this.CurrDemo) return false;
    return this.CurrDemo.Anim.IsPlaying;
  },

  IsTransient: function() {
    if (!this.CurrDemo) return false;
    var anim = this.CurrDemo.Anim;
    return anim.CurrState != anim.TargetState;
  },

  GetCurrPos: function() {
    if (!this.CurrDemo) return 0;
    return this.CurrDemo.Anim.CurrState;
  },

  GetNStates: function() {
    if (!this.CurrDemo) return 0;
    return this.CurrDemo.Anim.NStates;
  },

  GetLastPos: function() {
    if (!this.CurrDemo) return 0;
    return this.CurrDemo.Anim.NStates-1;
  },

  IsStartPos: function() {
    return this.GetCurrPos() == 0;
  },

  IsEndPos: function() {
    if (!this.CurrDemo) return false;
    var anim = this.CurrDemo.Anim;
    return anim.CurrState == anim.NStates-1;
  },

  IsTargetIsEndPos: function() {
    if (!this.CurrDemo) return false;
    var anim = this.CurrDemo.Anim;
    return anim.TargetState == anim.NStates-1;
  },

  Stop: function( callOnStop ) {
    callOnStop = xDefBool( callOnStop, true );
    if (!this.CurrDemo) return;
    this.CurrDemo.Anim.Stop();
    this.UpdateDemoPanels();
    if (callOnStop && this.OnStopFunc) this.OnStopFunc();
  },

  SetPos: function( pos, play ) {
    if (!this.CurrDemo) return;
    this.Stop( false );
    var anim = this.CurrDemo.Anim;
    if (pos > anim.NStates-1) pos = anim.NStates-1;
    if (pos < 0) pos = 0;
    anim.SetState( pos );
    if (play) {
      this.Play();
    } else {
      if (this.OnStopFunc) this.OnStopFunc();
    }
  },

  Next: function( wrap, play ) {
    if (this.IsEndPos()) {
      if (wrap) {
        this.SetPos( 0, play );
      } else {
        this.SetPos( this.GetCurrPos() );
      }
    } else {
      this.SetPos( this.GetCurrPos()+1, play );
    }
  },

  Prev: function( wrap, play ) {
    if (this.IsTransient()) {
      this.SetPos( this.GetCurrPos(), play );
    } else {
      if (this.IsStartPos()) {
        if (wrap) {
          this.SetPos( this.GetNStates()-1, play );
        } else {
          this.SetPos( 0, play );
        }
      } else {
        this.SetPos( this.GetCurrPos()-1, play );
      }
    }
  },

  Step: function( wrap, back, play ) {
    if (back) {
      this.Prev( wrap, play );
    } else {
      this.Next( wrap, play );
    }
  },

  IsNewName: function( name ) {
    return this.CurrDemo && this.CurrDemo.Name != name;
  },

  RequestName: function( name ) {
    if (!xStr(name)) {
      if (!this.CurrDemo) return '';
      name = this.CurrDemo.Name;
    }
    return name;
  },

  Play: function( name, reset ) {
    // name: string; name of a new demo or null for current demo
    name = this.RequestName( name );
    if (name == '') return;
    if (this.IsCurrDemoName(name)) {
      if (this.IsPlaying()) return;
    } else {
      this.Stop( false );
    }

    // assert: !this.IsPlaying() -> start new demo or restart curr demo
    if (!this.IsCurrDemoName(name)) {
      if (!this.SetNewDemo( name )) return;
    }
    var demo = this.CurrDemo;
    if (reset) demo.Anim.Reset();
    demo.Anim.Play();
    this.UpdateDemoPanels();
  },

  SetDemo: function( name, play, pos ) {
    // name: string; name of a new demo or null for current demo
    pos = xDefNum( pos, 0 );
    this.Stop( false );
    if (this.IsCurrDemoName(name)) {
      this.SetPos( pos, play );
      return;
    }

    // assert: !this.IsPlaying() -> start new demo
    if (this.SetNewDemo( name )) {
      this.SetPos( pos, play );
    }
  },

  SetSusDemo: function( play ) {
    if (!this.SusDemo) return;
    this.SetDemo( this.SusDemo.Name, play, this.SusState );
  },

  SetNewDemo: function( name ) {
    // private function
    var i = this.Find( name );
    if (i < 0) return false;
    this.LastDemo = this.CurrDemo;
    this.CurrDemo = this.DemoList[i];
    return true;
  },

  PlayStop: function( cont ) {
    if (!this.CurrDemo) return;
    if (this.IsPlaying()) {
      this.Stop( true );
      return;
    }
    // not playing
    if (this.IsTransient() && !cont) {
      this.Prev();
    }
    this.Play();
  },
};

xOnLoad(
  function(){
    Demos.Init();
    Tabs.AddButtonClickHandler( 'DomeDemoTabs', 'ResetButton',
      function( buttonData ) {
        ResetApp();
      }
    );
  }
);

xOnDomReady(
  function() {
    var boxTabName = 'DomeDemoTabs';
    Tabs.AddButtonClickHandler( boxTabName, 'BackButton',
      function( buttonData ) {
        Demos.Prev();
      }
    );
    Tabs.AddButtonClickHandler( boxTabName, 'ForwButton',
      function( buttonData ) {
        Demos.Next( true );
      }
    );
    Tabs.AddButtonClickHandler( boxTabName, 'PlayButton',
      function( buttonData ) {
        if (Demos.IsActive()) {
          if (Demos.IsPlaying()) {
            Demos.Stop();
          } else {
            Demos.Play();
          }
        } else {
          Demos.SetSusDemo();
        }
      }
    );
    Tabs.AddButtonClickHandler( boxTabName, 'CountButton',
      function( buttonData ) {
        if (Demos.IsEndPos()) {
          Demos.SetPos( 0 );
        } else {
          Demos.SetPos( Demos.GetLastPos() );
        }
      }
    );
  }
);

Demos.OnStopFunc = function() {
  UpdateUrl();
}


// Animation helper functions

var AnimRestartAction = 'stop';
var AnimTxt = 500 / AnimationSpeed;
var AnimT1 = 1000 / AnimationSpeed;
var AnimT2 = 2000 / AnimationSpeed;
var AnimT3 = 3000 / AnimationSpeed;
var AnimT4 = 4000 / AnimationSpeed;
var AnimT5 = 5000 / AnimationSpeed;
var AnimT6 = 6000 / AnimationSpeed;
var AnimT7 = 7000 / AnimationSpeed;
var AnimT8 = 8000 / AnimationSpeed;
var AnimT9 = 9000 / AnimationSpeed;
var AnimT10 = 10000 / AnimationSpeed;

function Tpse( time ) {
  time = xDefNum( time, AnimT2 );
  return {
    Mode: 'serial',
    TaskList: [ { ValueRef: 'pause', EndValue: 0 }, { ValueRef: 'pause', EndValue: time, TimeSpan: time } ],
  };
}

function Ttxt( txt, delay ) {
  if (xStr(txt)) {
    var obj1 = { ValueRef: 'Description', EndValue: '' };
    if (delay) obj1.Delay = delay;
    var obj2 = { Delay: AnimTxt, ValueRef: 'Description', EndValue: txt };
    return {
      Mode: 'serial',
      TaskList: [ obj1, obj2 ],
    };
  } else {
    delay = 0;
    if (xNum(txt)) delay = txt;
    var obj = { ValueRef: 'Description', EndValue: '' };
    if (delay) obj.Delay = delay;
    return obj;
  }
}

function Tpnt( txt, posTo, posFrom, delay ) {
  if (xStr(txt)) {
    delay = xDefNum( delay, 1 );
    if (!xDef(posFrom)) posFrom = JsgVect2.Add( posTo, [-150,-100] );
    return {
      Delay: delay,
      Mode: 'serial',
      TaskList: [
        { ValueRef: 'PointerText', EndValue: txt },
        { ValueRef: 'PointerFrom[0]', EndValue: posFrom[0] },
        { ValueRef: 'PointerFrom[1]', EndValue: posFrom[1] },
        { ValueRef: 'PointerTo[0]', EndValue: posTo[0] },
        { ValueRef: 'PointerTo[1]', EndValue: posTo[1] },
      ],
    };
  } else {
    delay = 1 ;
    if (xNum(txt)) delay = txt;
    return {
      Delay: delay,
      Mode: 'serial',
      TaskList: [
        { ValueRef: 'PointerText', EndValue: '' },
        { ValueRef: 'PointerFrom[0]', EndValue: 0 },
        { ValueRef: 'PointerFrom[1]', EndValue: 0 },
        { ValueRef: 'PointerTo[0]', EndValue: 0 },
        { ValueRef: 'PointerTo[1]', EndValue: 0 },
      ],
    };
  }
}

function Tval( name, val, time, delay, sweep ) {
  var obj = { ValueRef: name, EndValue: val, Sweep: 'cosine' };
  if (time) obj.TimeSpan = time;
  if (delay) obj.Delay = delay;
  if (sweep) obj.Sweep = sweep;
  return obj;
}

// -------------- create App window ------------------------------

FeDomeApp.CreateFeGraph();

// -------------- Demos -----------------------------------------

// Intro Demo

Demos.New( 'Intro' );

Demos.AddState(
  'FeDomeApp = { "Description": "", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": 0, "ObserverLong": 15, "Zoom": 1.4, "CameraDirection": 30, "CameraHeight": 25, "CameraDistance": 200150, "DateTime": 82.5, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": true, "ShowShadow": true, "ShowDomeGrid": true, "ShowSunTrack": false, "ShowMoonTrack": false, "ShowSphere": true, "ShowStars": false, "ShowDomeRays": true, "ShowSphereRays": true, "ShowManyRays": false }'
);

Demos.AddAnimation(
  {
    Mode: 'serial',
    TaskList: [
      Tval( 'ShowSphere', false, 0 ),
      Tval( 'ShowSphereRays', false, 0 ),
      Tval( 'ShowDomeRays', false, 0 ),
      Ttxt( 'This is the Flat Earth Model with the Dome as proposed by Flat Earthers.' ),
      Tval( 'DateTime', 76.46, AnimT10 ),
      Tval( 'ShowDomeRays', true, 0 ),
      Tpse(),
    ],
  }
);

Demos.AddState(
  'FeDomeApp = { "Description": "This is the Flat Earth Model with the Dome as proposed by Flat Earthers.", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": 0, "ObserverLong": 15, "Zoom": 1.4, "CameraDirection": 30, "CameraHeight": 25, "CameraDistance": 200150, "DateTime": 76.46, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": true, "ShowShadow": true, "ShowDomeGrid": true, "ShowSunTrack": false, "ShowMoonTrack": false, "ShowSphere": false, "ShowStars": false, "ShowDomeRays": true, "ShowSphereRays": false, "ShowManyRays": false }'
);

Demos.AddAnimation(
  {
    Mode: 'serial',
    TaskList: [
      Tpnt( 'Current Date and Time', [846,22], [785,75] ),
      Tval( 'DayOfYear', 63, AnimT2, AnimT1, 'linear' ),
      Tval( 'DayOfYear', 76, AnimT2, 0, 'linear' ),
      Tpnt( 'Sun/Moon Azimuth and Elevation', [806,70], [735,135], AnimT1 ),
      Tpnt( 'The Sun', [399,256], [348,309], AnimT4 ),
      Tpnt( 'The Moon', [243,149], [204,113], AnimT4 ),
      Tval( 'ShowDomeGrid', false, 0, AnimT3 ),
      Tpnt( 'Flat Earth Equator', [301,272], [204,204] ),
      Tpnt( 'Flat Earth 0-Meridian', [329,397], [253,353], AnimT3 ),
      Tval( 'ShowDomeGrid', true, 0, AnimT3 ),
      Tval( 'ShowFeGrid', false, 0 ),
      Tpnt( 'Dome Equator', [290,205], [243,251] ),
      Tpnt( 'Dome 0-Meridian', [373,415], [286,378], AnimT3 ),
      Tpnt( AnimT3 ),
      Tval( 'ShowFeGrid', true, 0 ),
      Tval( 'Zoom', 3.4, AnimT3 ),
      Tpnt( 'Observer Location', [397,394], [372,433], AnimT1 ),
      Tval( 'ObserverLat', -15, AnimT2 ),
      Tval( 'ObserverLat', 15, AnimT3 ),
      Tval( 'ObserverLat', 0, AnimT2 ),
      Tpnt( 'Northpole', [557,177], [599,149], AnimT1 ),
      Tpnt( 'Lightray from Sun to Observer', [412,181], [304,229], AnimT3 ),
      Tpnt( AnimT3 ),
      Tval( 'Zoom', 1.4, AnimT3 ),
      Tval( 'ShowFeGrid', false ),
      Tval( 'ShowDomeGrid', false ),
      Tpnt( 'Shadow of the Night', [498,238], [625,143], AnimT1 ),
      Tval( 'Time', 13.20, AnimT3 ),
      Tval( 'Time', 11.04, AnimT3 ),
      Tpnt( ),
      Tval( 'ShowDomeGrid', true, 0, AnimT1 ),
      Tpse(),
    ],
  }
);

Demos.AddState(
  'FeDomeApp = { "Description": "This is the Flat Earth Model with the Dome as proposed by Flat Earthers.", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": 0, "ObserverLong": 15, "Zoom": 1.4, "CameraDirection": 30, "CameraHeight": 25, "CameraDistance": 200150, "DateTime": 76.46, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": false, "ShowShadow": true, "ShowDomeGrid": true, "ShowSunTrack": false, "ShowMoonTrack": false, "ShowSphere": false, "ShowStars": false, "ShowDomeRays": true, "ShowSphereRays": false, "ShowManyRays": false }'
);

Demos.AddAnimation(
  {
    Mode: 'serial',
    TaskList: [
      Ttxt( 'To produce Sunrise and Sunset as observed in Reality,' ),
      Ttxt( 'Lightrays can not be straight but must bend!', AnimT4 ),
      Tval( 'DateTime', 78.2113, AnimT10+AnimT10 ),
      Tpse(),
    ],
  }
);

Demos.AddState(
  'FeDomeApp = { "Description": "Lightrays can not be straight but must bend!", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": 0, "ObserverLong": 15, "Zoom": 1.4, "CameraDirection": 30, "CameraHeight": 25, "CameraDistance": 200150, "DateTime": 78.2113, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": false, "ShowShadow": true, "ShowDomeGrid": true, "ShowSunTrack": false, "ShowMoonTrack": false, "ShowSphere": false, "ShowStars": false, "ShowDomeRays": true, "ShowSphereRays": false, "ShowManyRays": false }'
);

Demos.AddAnimation(
  {
    Mode: 'serial',
    TaskList: [
      Ttxt( 'From the Perspective of the Observer,' ),
      Ttxt( 'the Dome appears like a Celestial Sphere above the Observer.', AnimT3 ),
      Tval( 'ShowSphere', true, 0, AnimT3 ),
      Tpnt( 'Celestial Sphere', [344,316], [294,273] ),
      Tpnt( AnimT2 ),
      Tval( 'ShowSphereRays', true, 0 ),
      {
        Mode: 'parallel',
        TaskList: [
          Tval( 'CameraDirection', 76, AnimT3 ),
          Tval( 'CameraHeight', 13, AnimT3 ),
          Tval( 'Zoom', 2.5, AnimT3 ),
        ],
      },
      Tpnt( 'Sun\'s Position on the Dome', [756,130], [755,193], AnimT1 ),
      Tpnt( 'Sun\'s apparent Position', [396,373], [477,414], AnimT3 ),
      Tpnt( 'Moon\'s Position on the Dome', [302,149], [328,103], AnimT3 ),
      Tpnt( 'Moon\'s apparent Position', [270,220], [213,136], AnimT3 ),
      Tpnt( 'Moon-Phase as seen by the Observer', [64,74], [160,143], AnimT3 ),
      Tpse( AnimT4 ),
    ],
  }
);

Demos.AddState(
  'FeDomeApp = { "Description": "the Dome appears like a Celestial Sphere above the Observer.", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": 0, "ObserverLong": 15, "Zoom": 2.5, "CameraDirection": 76, "CameraHeight": 13, "CameraDistance": 200150, "DateTime": 78.2113, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": false, "ShowShadow": true, "ShowDomeGrid": true, "ShowSunTrack": false, "ShowMoonTrack": false, "ShowSphere": true, "ShowStars": false, "ShowDomeRays": true, "ShowSphereRays": true, "ShowManyRays": false }'
);

Demos.AddAnimation(
  {
    Mode: 'serial',
    TaskList: [
      Ttxt( 'While Sun and Moon rotate with the Dome around its Northpole,' ),
      Ttxt( 'Sun and Moon appear to travel on Latitude Lines of the Celestial Sphere.', AnimT4 ),
      Tpnt( 'Latitude Line', [365,237], [425,210], AnimT4 ),
      Tpnt( AnimT2 ),
      Tval( 'Time', 16.99, AnimT5, AnimT1 ),
      Tval( 'Time', 5.07, AnimT5, AnimT1 ),
      Tpse(),
    ],
  }
);

Demos.AddState(
  'FeDomeApp = { "Description": "Sun and Moon appear to travel on Latitude Lines of the Celestial Sphere.", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": 0, "ObserverLong": 15, "Zoom": 2.5, "CameraDirection": 76, "CameraHeight": 13, "CameraDistance": 200150, "DateTime": 78.2113, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": false, "ShowShadow": true, "ShowDomeGrid": true, "ShowSunTrack": false, "ShowMoonTrack": false, "ShowSphere": true, "ShowStars": false, "ShowDomeRays": true, "ShowSphereRays": true, "ShowManyRays": false }'
);

Demos.AddAnimation(
  {
    Mode: 'serial',
    TaskList: [
      Ttxt( 'The Elevation of the Poles of the Celestial Sphere corresponds to the Latitude of the Observer.' ),
      Tval( 'ShowFeGrid', true, 1, AnimT3 ),
      Tval( 'ObserverLat', 90, AnimT5 ),
      Tval( 'ObserverLat', 45, AnimT3 ),
      Tpnt( 'Observer Latitude = 45°', [243,348], [386,398] ),
      {
        Mode: 'parallel',
        TaskList: [
          Tval( 'PointerTo[0]', 386, AnimT2 ),
          Tval( 'PointerTo[1]', 333, AnimT2 ),
        ],
      },
      Tpnt( 'Elevation = 45°', [529,307], [537,146], AnimT2 ),
      {
        Mode: 'parallel',
        TaskList: [
          Tval( 'PointerTo[0]', 485, AnimT2 ),
          Tval( 'PointerTo[1]', 206, AnimT2 ),
        ],
      },
      Tpnt( AnimT2 ),
      Tval( 'Time', 16.99, AnimT5 ),
      Tval( 'Time', 5.07, AnimT5, AnimT2 ),
      Tpse(),
    ],
  }
);

Demos.AddState(
  'FeDomeApp = { "Description": "The Elevation of the Poles of the Celestial Sphere corresponds to the Latitude of the Observer.", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": 45, "ObserverLong": 15, "Zoom": 2.5, "CameraDirection": 76, "CameraHeight": 13, "CameraDistance": 200150, "DateTime": 78.2113, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": true, "ShowShadow": true, "ShowDomeGrid": true, "ShowSunTrack": false, "ShowMoonTrack": false, "ShowSphere": true, "ShowStars": false, "ShowDomeRays": true, "ShowSphereRays": true, "ShowManyRays": false }'
);

Demos.AddAnimation(
  {
    Mode: 'serial',
    TaskList: [
      Ttxt( 'North of the Equator one Celestial Pole always points due North.' ),
      Tpnt( 'North Celestial Pole', [486,206], [517,168], AnimT3 ),
      Tpnt( AnimT2 ),
      Tval( 'ObserverLat', 90, AnimT3 ),
      Tval( 'ObserverLat', 15, AnimT3 ),
      Ttxt( 'South of the Equator one Celestial Pole always points due South.' ),
      Tval( 'ObserverLat', -45, AnimT3 ),
      Tpnt( 'South Celestial Pole', [147,247], [96,205] ),
      Tpnt( AnimT2 ),
      Tval( 'ObserverLat', -90, AnimT3 ),
      Tval( 'ObserverLat', -15, AnimT3 ),
      Ttxt( 'At the Equator the Poles of the Celestial Sphere point to the Horizon due North-South.' ),
      Tval( 'ObserverLat', 0, AnimT2, AnimT3 ),
      Ttxt( 'Sun, Moon and Stars appear to rotate around the Celestial Poles anywhere on Earth (see Star-Trails)!' ),
      {
        Delay: AnimT3,
        Mode: 'parallel',
        TaskList: [
          Tval( 'DateTime', 82.5, 5*AnimT10, 0, 'linear' ),
          Tval( 'ObserverLat', -80, AnimT10 ),
          Tval( 'ObserverLat', 80, 2*AnimT10, AnimT10 ),
          Tval( 'ObserverLat', 0.001, AnimT10, 3*AnimT10 ),
        ],
      },
      {
        Delay: AnimT1,
        Mode: 'parallel',
        TaskList: [
          Tval( 'CameraDirection', 30, AnimT3 ),
          Tval( 'CameraHeight', 25, AnimT3 ),
          Tval( 'Zoom', 1.4, AnimT3 ),
        ],
      },
    ],
  }
);

Demos.AddState(
  'FeDomeApp = { "Description": "Sun, Moon and Stars appear to rotate around the Celestial Poles anywhere on Earth (see Star-Trails)!", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": 0, "ObserverLong": 15, "Zoom": 1.4, "CameraDirection": 30, "CameraHeight": 25, "CameraDistance": 200150, "DateTime": 82.5, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": true, "ShowShadow": true, "ShowDomeGrid": true, "ShowSunTrack": false, "ShowMoonTrack": false, "ShowSphere": true, "ShowStars": false, "ShowDomeRays": true, "ShowSphereRays": true, "ShowManyRays": false }'
);

// Eclipses Demo

Demos.New( 'Eclipses' );

Demos.AddState(
  'FeDomeApp = { "Description": "", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": 0, "ObserverLong": 15, "Zoom": 1.4, "CameraDirection": 30, "CameraHeight": 25, "CameraDistance": 200150, "DateTime": 82.5, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": true, "ShowShadow": true, "ShowDomeGrid": true, "ShowSunTrack": false, "ShowMoonTrack": false, "ShowSphere": true, "ShowStars": false, "ShowDomeRays": true, "ShowSphereRays": true, "ShowManyRays": false }'
);

Demos.AddAnimation(
  {
    Mode: 'serial',
    TaskList: [
      Ttxt( 'Lets see the Tracks of Sun and Moon on the Dome...' ),
      Tval( 'ShowFeGrid', false, 0 ),
      Tval( 'ShowShadow', false, 0 ),
      Tval( 'ShowDomeGrid', false, 0 ),
      Tval( 'ShowSphere', false, 0 ),
      Tval( 'ShowSphereRays', false, 0 ),
      Tval( 'ShowDomeRays', false, 0 ),
      Tval( 'ShowSunTrack', true, 0 ),
      Tval( 'ObserverLat', 90, 0 ),
      Tval( 'ObserverLong', 0, 0 ),
      {
        Mode: 'parallel',
        TaskList: [
          Tval( 'CameraDirection', 0, AnimT4 ),
          Tval( 'CameraHeight', 89.9, AnimT4 ),
          Tval( 'Zoom', 1.25, AnimT4 ),
          Tval( 'DayOfYear', 117, AnimT4, 0, 'linear' ),
          Tval( 'Time', 9.44, AnimT4 ),
        ],
      },
      Tpse( AnimT3 ),
    ],
  }
);

Demos.AddState(
  'FeDomeApp = { "Description": "Lets see the Tracks of Sun and Moon on the Dome...", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": 90, "ObserverLong": 0, "Zoom": 1.25, "CameraDirection": 0, "CameraHeight": 89.9, "CameraDistance": 200150, "DateTime": 117.3933, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": false, "ShowShadow": false, "ShowDomeGrid": false, "ShowSunTrack": true, "ShowMoonTrack": false, "ShowSphere": false, "ShowStars": false, "ShowDomeRays": false, "ShowSphereRays": false, "ShowManyRays": false }'
);

Demos.AddAnimation(
  {
    Mode: 'serial',
    TaskList: [
      Ttxt( 'Earth\'s Axes is tilted 23.4° with respect to its Orbital Plane around the Sun (Ecliptic).' ),
      Ttxt( 'So the Sun follows a 23.4° tilted Track on the Fixed Stars Background, causing Seasons.', AnimT5 ),
      Tpnt( 'Suns Ecliptic = annual Track on the Dome', [372,411], [400,351], AnimT5 ),
      Tpse( AnimT5 ),
    ],
  }
);

Demos.AddState(
  'FeDomeApp = { "Description": "So the Sun follows a 23.4° tilted Track on the Fixed Stars Background, causing Seasons.", "PointerFrom": [ 400, 351 ], "PointerTo": [ 372, 414 ], "PointerText": "Suns Ecliptic = annual Track on the Dome", "ObserverLat": 90, "ObserverLong": 0, "Zoom": 1.25, "CameraDirection": 0, "CameraHeight": 89.9, "CameraDistance": 200150, "DateTime": 117.3933, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": false, "ShowShadow": false, "ShowDomeGrid": false, "ShowSunTrack": true, "ShowMoonTrack": false, "ShowSphere": false, "ShowStars": false, "ShowDomeRays": false, "ShowSphereRays": false, "ShowManyRays": false }'
);

Demos.AddAnimation(
  {
    Mode: 'serial',
    TaskList: [
      Tpnt(),
      Ttxt( 'The 4 red dots mark the locations of Equinox and Solstice.' ),
      Tpnt( 'Celestial Equator Line', [613,287], [648,342], AnimT5 ),
      Tpnt( 'June Solstice Line', [479,366], [469,312], AnimT3 ),
      Tpnt( 'December Solstice Line', [656,279], [717,334], AnimT3 ),
      Tpnt( AnimT3 ),
      {
        Delay: AnimT1,
        Mode: 'parallel',
        TaskList: [
          Tval( 'DayOfYear', 170, AnimT2 ),
          Tval( 'Time', 5.98, AnimT2 ),
        ],
      },
      Tpnt( 'June Solstice', [585,252], [663,182], AnimT1 ),
      Tpnt( AnimT3 ),
      {
        Mode: 'parallel',
        TaskList: [
          Tval( 'DayOfYear', 261, AnimT3 ),
          Tval( 'Time', 0.01, AnimT3 ),
        ],
      },
      Tpnt( 'September Equinox', [461,86], [500,54], AnimT1 ),
      Tpnt( AnimT3 ),
      {
        Mode: 'parallel',
        TaskList: [
          Tval( 'DayOfYear', 353, AnimT3 ),
          Tval( 'Time', -6.01, AnimT3 ),
        ],
      },
      Tval( 'DayOfYear', 352, 0 ),
      Tval( 'Time', 17.99, 0 ),
      Tpnt( 'December Solstice', [241,247], [179,212], AnimT1 ),
      Tpnt( AnimT3 ),
      {
        Mode: 'parallel',
        TaskList: [
          Tval( 'DayOfYear', 443, AnimT3 ),
          Tval( 'Time', 12.0, AnimT3 ),
        ],
      },
      Tpnt( 'March Equinox', [454,399], [454,358], AnimT1 ),
      Tpnt( AnimT3 ),
      {
        Mode: 'parallel',
        TaskList: [
          Tval( 'DayOfYear', 482, AnimT2 ),
          Tval( 'Time', 9.47, AnimT2 ),
        ],
      },
      Tval( 'DayOfYear', 117, 0 ),
      Tval( 'Time', 9.44, 0 ),
      Tpse(),
    ],
  }
);

Demos.AddState(
  'FeDomeApp = { "Description": "The 4 red dots mark the locations of Equinox and Solstice.", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": 90, "ObserverLong": 0, "Zoom": 1.25, "CameraDirection": 0, "CameraHeight": 89.9, "CameraDistance": 200150, "DateTime": 117.3933, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": false, "ShowShadow": false, "ShowDomeGrid": false, "ShowSunTrack": true, "ShowMoonTrack": false, "ShowSphere": false, "ShowStars": false, "ShowDomeRays": false, "ShowSphereRays": false, "ShowManyRays": false }'
);

Demos.AddAnimation(
  {
    Mode: 'serial',
    TaskList: [
      Ttxt( 'Lets have a look at the Track of the Moon:' ),
      Tval( 'ShowSunTrack', false, AnimT1 ),
      Tval( 'ShowMoonTrack', true, AnimT1 ),
      Tpnt( 'Moons Ecliptic = monthly Track on the Dome', [549,172], [633,120], AnimT5 ),
      Ttxt( 'The Moon\'s Ecliptic plane is tilted 5.1° with respect to Sun\'s Ecliptic Plane.', AnimT5 ),
      Ttxt( 'This means the Track of the Moon extends now farther north and south than the Sun.', AnimT7 ),
      Tpse( AnimT5 ),
    ],
  }
);

Demos.AddState(
  'FeDomeApp = { "Description": "This means the Track of the Moon extends now farther north and south than the Sun.", "PointerFrom": [ 633, 120 ], "PointerTo": [ 549, 172 ], "PointerText": "Moons Ecliptic = monthly Track on the Dome", "ObserverLat": 90, "ObserverLong": 0, "Zoom": 1.25, "CameraDirection": 0, "CameraHeight": 89.9, "CameraDistance": 200150, "DateTime": 117.3933, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": false, "ShowShadow": false, "ShowDomeGrid": false, "ShowSunTrack": false, "ShowMoonTrack": true, "ShowSphere": false, "ShowStars": false, "ShowDomeRays": false, "ShowSphereRays": false, "ShowManyRays": false }'
);

Demos.AddAnimation(
  {
    Mode: 'serial',
    TaskList: [
      Tpnt(),
      Tval( 'ShowSunTrack', true, AnimT1 ),
      Ttxt( 'The green dots are the intersection Knots of Sun and Moon Eclipse.' ),
      Tpnt( 'Knot', [392,415], [420,342], AnimT1 ),
      Ttxt( 'Due to Precession of the Moon\'s Orbit of 19.3° per year retrograde.', AnimT5 ),
      Ttxt( 'The green intersection Knots move slowly in the opposite direction of Sun and Moon.', AnimT5 ),
      Tpnt( 'Start Position', [392,415], [420,342] ),
      {
        Delay: AnimT3,
        Mode: 'parallel',
        TaskList: [
          Tval( 'DayOfYear', 482, 2*AnimT10, 0, 'linear' ),
          Tval( 'Time', -14.48, 2*AnimT10, 0, 'linear' ),
        ],
      },
      Tval( 'Time', 9.47, 0 ),
      Tval( 'DayOfYear', 117, 0, AnimT3 ),
      Tval( 'Time', 9.44, 0 ),
      Tpnt( AnimT3 ),
      Tpse(),
    ],
  }
);

Demos.AddState(
  'FeDomeApp = { "Description": "The green intersection Knots move slowly in the opposite direction of Sun and Moon.", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": 90, "ObserverLong": 0, "Zoom": 1.25, "CameraDirection": 0, "CameraHeight": 89.9, "CameraDistance": 200150, "DateTime": 117.3933, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": false, "ShowShadow": false, "ShowDomeGrid": false, "ShowSunTrack": true, "ShowMoonTrack": true, "ShowSphere": false, "ShowStars": false, "ShowDomeRays": false, "ShowSphereRays": false, "ShowManyRays": false }'
);

Demos.AddAnimation(
  {
    Mode: 'serial',
    TaskList: [
      Ttxt( 'If Sun and Moon meet at opposite green Knots, a Lunar Eclipse happens.' ),
      Ttxt( 'If Sun and Moon meet at the same green Knot, a Solar Eclipse happens.', AnimT5 ),
      Tval( 'DateTime', 117.0671, AnimT3, AnimT5 ),
      Tpnt( 'Target', [304,250], [264,212], AnimT1 ),
      Tval( 'Time', 25.6104, 0 ),
      {
        Mode: 'parallel',
        TaskList: [
          Tval( 'DayOfYear', 232, AnimT10 ),
          Tval( 'Time', 18.0, AnimT10 ),
        ],
      },
      Tpnt( 'Solar Eclipse 21. Aug. 2017 / 18:00', [304,250], [264,212], AnimT1 ),
      Tpse(),
    ],
  }
);

Demos.AddState(
  'FeDomeApp = { "Description": "If Sun and Moon meet at the same green Knot, a Solar Eclipse happens.", "PointerFrom": [ 264, 212 ], "PointerTo": [ 304, 250 ], "PointerText": "Solar Eclipse 21. Aug. 2017 / 18:00", "ObserverLat": 90, "ObserverLong": 0, "Zoom": 1.25, "CameraDirection": 0, "CameraHeight": 89.9, "CameraDistance": 200150, "DateTime": 232.75, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": false, "ShowShadow": false, "ShowDomeGrid": false, "ShowSunTrack": true, "ShowMoonTrack": true, "ShowSphere": false, "ShowStars": false, "ShowDomeRays": false, "ShowSphereRays": false, "ShowManyRays": false }'
);

Demos.AddAnimation(
  {
    Mode: 'serial',
    TaskList: [
      Ttxt( 'Solar Eclipse on 21. Aug. 2017' ),
      Tpnt(),
      Tval( 'ShowDomeGrid', true, 0 ),
      Tval( 'ObserverLong', -87.6667, 0 ),
      {
        Mode: 'parallel',
        TaskList: [
          Tval( 'ObserverLat', 36.9667, AnimT5 ),
          Tval( 'CameraDirection', -66, AnimT5 ),
          Tval( 'CameraHeight', 19, AnimT5 ),
          Tval( 'Zoom', 3.1, AnimT5 ),
        ],
      },
      Tval( 'ShowSphere', true, 0 ),
      Tval( 'ShowSphereRays', true, 0 ),
      Tpnt( 'Sun and Moon in the same Direction', [385,202], [220,152], AnimT1 ),
      Tval( 'ShowDomeRays', true, 0, AnimT3 ),
      Tpnt( 'Sun and Moon at the same Spot', [368,71], [220,152], AnimT1 ),
      Tpnt( AnimT3 ),
    ],
  }
);

Demos.AddState(
  'FeDomeApp = { "Description": "Solar Eclipse on 21. Aug. 2017", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": 36.9667, "ObserverLong": -87.6667, "Zoom": 3.1, "CameraDirection": -66, "CameraHeight": 19, "CameraDistance": 200150, "DateTime": 232.75, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": false, "ShowShadow": false, "ShowDomeGrid": true, "ShowSunTrack": true, "ShowMoonTrack": true, "ShowSphere": true, "ShowStars": false, "ShowDomeRays": true, "ShowSphereRays": true, "ShowManyRays": false }'
);

Demos.AddAnimation(
  {
    Mode: 'serial',
    TaskList: [
      Tval( 'Zoom', 2.2, AnimT3 ),
      Tval( 'ShowShadow', true, 0 ),
      Tval( 'DateTime', 232.4767, AnimT5 ),
      Tpnt( 'Sunrise: not yet aligned', [565,351], [742,262], AnimT1 ),
      Tpnt( 'Sunrise: not yet aligned', [719,118], [742,262], AnimT3 ),
      Tpnt( AnimT3 ),
      Tval( 'DateTime', 233.0208, AnimT5 ),
      Tpnt( 'Sunset: not aligned anymore', [290,318], [166,225], AnimT1 ),
      Tpnt( 'Sunset: not aligned anymore', [253,64], [166,225], AnimT3 ),
      Tpnt( AnimT3 ),
      Tval( 'ShowSunTrack', false, 0 ),
      Tval( 'ShowMoonTrack', false, 0 ),
      Ttxt(),
      Tval( 'DayOfYear', 82, AnimT4 ),
      {
        Mode: 'parallel',
        TaskList: [
          Tval( 'ObserverLat', 0, AnimT4 ),
          Tval( 'ObserverLong', 15, AnimT4 ),
          Tval( 'CameraDirection', 30, AnimT4 ),
          Tval( 'CameraHeight', 25, AnimT4 ),
          Tval( 'Zoom', 1.4, AnimT4 ),
          Tval( 'DateTime', 82.5, AnimT4 ),
        ],
      },
      Tval( 'ShowFeGrid', true, 0 ),
    ],
  }
);

Demos.AddState(
  'FeDomeApp = { "Description": "", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": 0, "ObserverLong": 15, "Zoom": 1.4, "CameraDirection": 30, "CameraHeight": 25, "CameraDistance": 200150, "DateTime": 82.5, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": true, "ShowShadow": true, "ShowDomeGrid": true, "ShowSunTrack": false, "ShowMoonTrack": false, "ShowSphere": true, "ShowStars": false, "ShowDomeRays": true, "ShowSphereRays": true, "ShowManyRays": false }'
);

// Equinox Demo

Demos.New( 'Equinox' );

Demos.AddState(
  'FeDomeApp = { "Description": "", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": 0, "ObserverLong": 15, "Zoom": 1.4, "CameraDirection": 30, "CameraHeight": 25, "CameraDistance": 200150, "DateTime": 82.5, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": true, "ShowShadow": true, "ShowDomeGrid": true, "ShowSunTrack": false, "ShowMoonTrack": false, "ShowSphere": true, "ShowStars": false, "ShowDomeRays": true, "ShowSphereRays": true, "ShowManyRays": false, "RayParameter": 1, "RayTarget": 0, "RaySource": 0 }'
);

Demos.AddAnimation(
  {
    Mode: 'serial',
    TaskList: [
      Ttxt( 'Lets investigate the Light Rays on Equinox.' ),
      Tval( 'ShowFeGrid', false, 0 ),
      {
        Mode: 'parallel',
        TaskList: [
          Tval( 'CameraDirection', 45, AnimT3 ),
          Tval( 'CameraHeight', 15, AnimT3 ),
          Tval( 'Zoom', 1.9, AnimT3 ),
          Tval( 'DateTime', 78.254167, AnimT3 ),
          Tval( 'ObserverLong', 0, AnimT3 ),
        ],
      },
      Tpse(),
    ],
  }
);

Demos.AddState(
  'FeDomeApp = { "Description": "Lets investigate the Light Rays on Equinox.", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": 0, "ObserverLong": 0, "Zoom": 1.9, "CameraDirection": 45, "CameraHeight": 15, "CameraDistance": 200150, "DateTime": 78.254167, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": false, "ShowShadow": true, "ShowDomeGrid": true, "ShowSunTrack": false, "ShowMoonTrack": false, "ShowSphere": true, "ShowStars": false, "ShowDomeRays": true, "ShowSphereRays": true, "ShowManyRays": false }'
);

Demos.AddAnimation(
  {
    Mode: 'serial',
    TaskList: [
      Ttxt( 'At Equinox the Sun raises everywhere on Earth exactly due East.' ),
      Tpnt( 'Sunrise due Easth', [435,376], [506,394], AnimT1 ),
      Tpnt( AnimT3 ),
      {
        Mode: 'parallel',
        TaskList: [
          Tval( 'ObserverLong', -360, AnimT10 ),
          Tval( 'Time', 30.1, AnimT10 ),
          Tval( 'CameraDirection', -315, AnimT10 ),
          Tval( 'ObserverLat', 85, AnimT3 ),
          Tval( 'ObserverLat', -75, AnimT4, AnimT3 ),
          Tval( 'ObserverLat', 0.01, AnimT3, AnimT7 ),
        ],
      },
      Tval( 'DateTime', 79.2542, 0 ),
      Ttxt( 'And at Equinox the Sun sets everywhere on Earth exactly due West.' ),
      Tval( 'DateTime', 79.7458, AnimT3 ),
      Tpnt( 'Sunset due West', [247,324], [168,299], AnimT1 ),
      Tpnt( AnimT3 ),
      Tval( 'DayOfYear', 78, 0 ),
      Tval( 'Time', 41.9, 0 ),
      {
        Mode: 'parallel',
        TaskList: [
          Tval( 'ObserverLong', 0, AnimT10 ),
          Tval( 'Time', 17.9, AnimT10 ),
          Tval( 'CameraDirection', 45, AnimT10 ),
          Tval( 'ObserverLat', 85, 0.9*AnimT3 ),
          Tval( 'ObserverLat', -60, 0.9*AnimT4, AnimT3 ),
          Tval( 'ObserverLat', 0.001, AnimT3, AnimT7 ),
        ],
      },
      Tpse(),
    ],
  }
);

Demos.AddState(
  'FeDomeApp = { "Description": "And at Equinox the Sun sets everywhere on Earth exactly due West.", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": 0, "ObserverLong": 0, "Zoom": 1.9, "CameraDirection": 45, "CameraHeight": 15, "CameraDistance": 200150, "DateTime": 78.7458, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": false, "ShowShadow": true, "ShowDomeGrid": true, "ShowSunTrack": false, "ShowMoonTrack": false, "ShowSphere": true, "ShowStars": false, "ShowDomeRays": true, "ShowSphereRays": true, "ShowManyRays": false }'
);

Demos.AddAnimation(
  {
    Mode: 'serial',
    TaskList: [
      Ttxt( 'Lets see how the Sun distributes its light:' ),
      Tval( 'ShowSphere', false, 0 ),
      Tval( 'ShowSphereRays', false, 0 ),
      Tval( 'ShowManyRays', true, 0 ),
      Tval( 'RayTarget', 1, 0, AnimT2 ),
      Tpse(),
    ],
  }
);

Demos.AddState(
  'FeDomeApp = { "Description": "Lets see how the Sun distributes its light:", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": 0, "ObserverLong": 0, "Zoom": 1.9, "CameraDirection": 45, "CameraHeight": 15, "CameraDistance": 200150, "DateTime": 78.7458, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": false, "ShowShadow": true, "ShowDomeGrid": true, "ShowSunTrack": false, "ShowMoonTrack": false, "ShowSphere": false, "ShowStars": false, "ShowDomeRays": true, "ShowSphereRays": false, "ShowManyRays": true, "RayParameter": 1, "RayTarget": 1, "RaySource": 0 }'
);

Demos.AddAnimation(
  {
    Mode: 'serial',
    TaskList: [
      Tval( 'DateTime', 78.4875, AnimT3, AnimT1 ),

      {
        Delay: AnimT1,
        Mode: 'parallel',
        TaskList: [
          Tval( 'ObserverLat', -90, AnimT5 ),
          Tval( 'Zoom', 1.6, AnimT5 ),
          Tval( 'CameraDirection', 184, AnimT5 ),
          Tval( 'CameraHeight', 89.9, AnimT5 ),
        ],
      },
      Ttxt( 'Equinox = Sunrise due East, Sunset due West - everywhere.' ),
      Tpnt( 'Sunrise due Easth', [482,353], [646,405], AnimT1 ),
      Tval( 'PointerTo[0]', 833, AnimT3 ),

      Tpnt( 'Sunset due West', [412,354], [247,409], AnimT1 ),
      Tval( 'PointerTo[0]', 64, AnimT3 ),
      Tpnt( AnimT1 ),
    ],
  }
);

Demos.AddState(
  'FeDomeApp = { "Description": "Equinox = Sunrise due East, Sunset due West - everywhere.", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": -90, "ObserverLong": 0, "Zoom": 1.6, "CameraDirection": 184, "CameraHeight": 89.9, "CameraDistance": 200150, "DateTime": 78.4875, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": false, "ShowShadow": true, "ShowDomeGrid": true, "ShowSunTrack": false, "ShowMoonTrack": false, "ShowSphere": false, "ShowStars": false, "ShowDomeRays": true, "ShowSphereRays": false, "ShowManyRays": true, "RayParameter": 1, "RayTarget": 1, "RaySource": 0 }'
);


Demos.AddAnimation(
  {
    Mode: 'serial',
    TaskList: [
      {
        Delay: AnimT1,
        Mode: 'parallel',
        TaskList: [
          Tval( 'Zoom', 1.3, AnimT5 ),
          Tval( 'CameraHeight', 20, AnimT5 ),
        ],
      },
      Tval( 'DateTime', 79.489933, 2*AnimT10 ),
      Tval( 'DateTime', 78.489933, 0 ),
    ],
  }
);

Demos.AddState(
  'FeDomeApp = { "Description": "Equinox = Sunrise due East, Sunset due West - everywhere.", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": -90, "ObserverLong": 0, "Zoom": 1.3, "CameraDirection": 184, "CameraHeight": 20, "CameraDistance": 200150, "DateTime": 78.489933, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": false, "ShowShadow": true, "ShowDomeGrid": true, "ShowSunTrack": false, "ShowMoonTrack": false, "ShowSphere": false, "ShowStars": false, "ShowDomeRays": true, "ShowSphereRays": false, "ShowManyRays": true, "RayParameter": 1, "RayTarget": 1, "RaySource": 0 }'
);


// Day and Night Demo

Demos.New( 'DayNight' );

Demos.AddState(
  'FeDomeApp = { "Description": "", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": 0, "ObserverLong": 15, "Zoom": 1.4, "CameraDirection": 30, "CameraHeight": 25, "CameraDistance": 200150, "DateTime": 82.5, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": true, "ShowShadow": true, "ShowDomeGrid": true, "ShowSunTrack": false, "ShowMoonTrack": false, "ShowSphere": true, "ShowStars": false, "ShowDomeRays": true, "ShowSphereRays": true, "ShowManyRays": false }'
);

Demos.AddAnimation(
  {
    Mode: 'serial',
    TaskList: [
      Ttxt( 'Lets investigate the shape of the Night Shadow on the Flat Earth.' ),
      Tval( 'ShowFeGrid', false, 0 ),
      Tval( 'ShowSphere', false, 0 ),
      Tval( 'ShowSphereRays', false, 0 ),
      Tval( 'ShowDomeRays', false, 0 ),
      {
        Mode: 'parallel',
        TaskList: [
          Tval( 'ObserverLong', 0, AnimT2 ),
          Tval( 'CameraDirection', 0, AnimT2 ),
          Tval( 'CameraHeight', 30, AnimT2 ),
          Tval( 'Zoom', 1.25, AnimT2 ),
          Tval( 'DayOfYear', 78, AnimT2, 0, 'linear' ),
          Tval( 'Time', 12, AnimT2 ),
        ],
      },
    ],
  }
);

Demos.AddState(
  'FeDomeApp = { "Description": "Lets investigate the shape of the Night Shadow on the Flat Earth.", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": 0, "ObserverLong": 0, "Zoom": 1.25, "CameraDirection": 0, "CameraHeight": 30, "CameraDistance": 200150, "DateTime": 78.5, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": false, "ShowShadow": true, "ShowDomeGrid": true, "ShowSunTrack": false, "ShowMoonTrack": false, "ShowSphere": false, "ShowStars": false, "ShowDomeRays": false, "ShowSphereRays": false, "ShowManyRays": false }'
);

Demos.AddAnimation(
  {
    Mode: 'serial',
    TaskList: [
      Ttxt( 'The Border of the Night Shadow in this Animation is based on Reality. It depends on the Sun\'s Position.' ),
      {
        Mode: 'serial',
        TaskList: [
          Tval( 'DayOfYear', 443, AnimT10, AnimT1, 'linear' ),
          Tval( 'DayOfYear', 78, 0 ),
        ],
      },
      Ttxt( 'The Animation shows the Position of the Sun at each Noon of the Observer, starting at March Equinox.' ),
      {
        Mode: 'serial',
        TaskList: [
          Tval( 'DayOfYear', 443, AnimT10, AnimT1, 'linear' ),
          Tval( 'DayOfYear', 78, 0 ),
        ],
      },
      Tpse(),
    ],
  }
);

Demos.AddState(
  'FeDomeApp = { "Description": "The Animation shows the Position of the Sun at each Noon of the Observer, starting at March Equinox.", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": 0, "ObserverLong": 0, "Zoom": 1.25, "CameraDirection": 0, "CameraHeight": 30, "CameraDistance": 200150, "DateTime": 78.5, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": false, "ShowShadow": true, "ShowDomeGrid": true, "ShowSunTrack": false, "ShowMoonTrack": false, "ShowSphere": false, "ShowStars": false, "ShowDomeRays": false, "ShowSphereRays": false, "ShowManyRays": false }'
);

Demos.AddAnimation(
  {
    Mode: 'serial',
    TaskList: [
      Ttxt( 'Note the figure 8 the Sun traces due to the tilted Axes of the Earth.' ),
      Tval( 'ShowSunTrack', true, 0 ),
      {
        Mode: 'serial',
        TaskList: [
          Tval( 'DayOfYear', 443, AnimT10, AnimT1, 'linear' ),
          Tval( 'DayOfYear', 78, 0 ),
        ],
      },
      Tpse(),
    ],
  }
);

Demos.AddState(
  'FeDomeApp = { "Description": "Note the figure 8 the Sun traces due to the tilted Axes of the Earth.", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": 0, "ObserverLong": 0, "Zoom": 1.25, "CameraDirection": 0, "CameraHeight": 30, "CameraDistance": 200150, "DateTime": 78.5, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": false, "ShowShadow": true, "ShowDomeGrid": true, "ShowSunTrack": true, "ShowMoonTrack": false, "ShowSphere": false, "ShowStars": false, "ShowDomeRays": false, "ShowSphereRays": false, "ShowManyRays": false }'
);

Demos.AddAnimation(
  {
    Mode: 'serial',
    TaskList: [
      Ttxt( 'Here is how the Sun illuminates the lit part of the Flat Earth.' ),
      Tval( 'ShowDomeGrid', false, 0 ),
      Tval( 'ShowSunTrack', false, 0 ),
      Tval( 'ShowManyRays', true, 0 ),
      Tval( 'RayTarget', 1, 0 ),
      {
        Mode: 'parallel',
        TaskList: [
          Tval( 'Zoom', 1.5, AnimT2 ),
          Tval( 'CameraHeight', 25, AnimT2 ),
        ],
      },
      {
        Mode: 'serial',
        TaskList: [
          Tval( 'DayOfYear', 443, AnimT10, AnimT1, 'linear' ),
          Tval( 'DayOfYear', 78, 0 ),
        ],
      },
      Tpse(),
    ],
  }
);

Demos.AddState(
  'FeDomeApp = { "Description": "Here is how the Sun illuminates the lit part of the Flat Earth.", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": 0, "ObserverLong": 0, "Zoom": 1.5, "CameraDirection": 0, "CameraHeight": 25, "CameraDistance": 200150, "DateTime": 78.5, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": false, "ShowShadow": true, "ShowDomeGrid": false, "ShowSunTrack": false, "ShowMoonTrack": false, "ShowSphere": false, "ShowStars": false, "ShowDomeRays": false, "ShowSphereRays": false, "ShowManyRays": true, "RayParameter": 1, "RayTarget": 1, "RaySource": 0 }'
);

Demos.AddAnimation(
  {
    Mode: 'serial',
    TaskList: [
      Tval( 'CameraDirection', 90, AnimT3 ),
      {
        Mode: 'parallel',
        TaskList: [
          {
            Mode: 'serial',
            TaskList: [
              Tval( 'DayOfYear', 717, 3*AnimT5, AnimT1, 'linear' ),
              Tval( 'DayOfYear', 352, 0 ),
            ],
          },
          Tval( 'CameraHeight', 10, 3*AnimT5 ),
        ],
      },
      Tpse(),
    ],
  }
);

Demos.AddState(
  'FeDomeApp = { "Description": "Here is how the Sun illuminates the lit part of the Flat Earth.", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": 0, "ObserverLong": 0, "Zoom": 1.5, "CameraDirection": 90, "CameraHeight": 10, "CameraDistance": 200150, "DateTime": 352.5, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": false, "ShowShadow": true, "ShowDomeGrid": false, "ShowSunTrack": false, "ShowMoonTrack": false, "ShowSphere": false, "ShowStars": false, "ShowDomeRays": false, "ShowSphereRays": false, "ShowManyRays": true, "RayParameter": 1, "RayTarget": 1, "RaySource": 0 }'
);


// Poles Demo

Demos.New( 'Poles' );

Demos.AddState(
  'FeDomeApp = { "Description": "", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": 0, "ObserverLong": 15, "Zoom": 1.4, "CameraDirection": 30, "CameraHeight": 25, "CameraDistance": 200150, "DateTime": 82.5, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": true, "ShowShadow": true, "ShowDomeGrid": true, "ShowSunTrack": false, "ShowMoonTrack": false, "ShowSphere": true, "ShowStars": false, "ShowDomeRays": true, "ShowSphereRays": true, "ShowManyRays": false }'
);

Demos.AddAnimation(
  {
    Mode: 'serial',
    TaskList: [
      Ttxt( 'Lets investigate Day and Night at the Poles at the Solstices:' ),
      Tval( 'ShowFeGrid', false, 0 ),
      Tval( 'ShowSunTrack', true, 0 ),
      {
        Mode: 'parallel',
        TaskList: [
          Tval( 'CameraDirection', 45, AnimT3 ),
          Tval( 'CameraHeight', 15, AnimT3 ),
          Tval( 'Zoom', 1.9, AnimT3 ),
        ],
      },
      Ttxt( 'Setting Date to June Solstice:' ),
      Tval( 'DayOfYear', 169, AnimT3 ),
      Tval( 'DateTime', 169.5, 0 ),

      Ttxt( 'June Solstice Northpole' ),
      Tval( 'ObserverLat', 90, AnimT3 ),
      Tval( 'DateTime', 170.5, AnimT3 ),
      Ttxt( 'June Solstice Northpole: 24 h Sunlight' ),
      Tval( 'DateTime', 172.5, AnimT6 ),
      Tpse(),
    ],
  }
);

Demos.AddState(
  'FeDomeApp = { "Description": "June Solstice Northpole: 24 h Sunlight", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": 90, "ObserverLong": 15, "Zoom": 1.9, "CameraDirection": 45, "CameraHeight": 15, "CameraDistance": 200150, "DateTime": 169.5, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": false, "ShowShadow": true, "ShowDomeGrid": true, "ShowSunTrack": true, "ShowMoonTrack": false, "ShowSphere": true, "ShowStars": false, "ShowDomeRays": true, "ShowSphereRays": true, "ShowManyRays": false }'
);

Demos.AddAnimation(
  {
    Mode: 'serial',
    TaskList: [
      Ttxt( 'June Solstice Antarctica' ),
      Tval( 'ObserverLat', -90, AnimT3 ),
      Tval( 'DateTime', 170.5, AnimT3 ),
      Ttxt( 'June Solstice Antarctica: 24 h Darkness' ),
      Tval( 'DateTime', 172.5, AnimT6 ),
      Tpse(),
    ],
  }
);

Demos.AddState(
  'FeDomeApp = { "Description": "June Solstice Antarctica: 24 h Darkness", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": -90, "ObserverLong": 15, "Zoom": 1.9, "CameraDirection": 45, "CameraHeight": 15, "CameraDistance": 200150, "DateTime": 169.5, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": false, "ShowShadow": true, "ShowDomeGrid": true, "ShowSunTrack": true, "ShowMoonTrack": false, "ShowSphere": true, "ShowStars": false, "ShowDomeRays": true, "ShowSphereRays": true, "ShowManyRays": false }'
);

Demos.AddAnimation(
  {
    Mode: 'serial',
    TaskList: [
      Ttxt( 'Setting Date to December Solstice:' ),
      Tval( 'ObserverLat', 0, AnimT2 ),
      Tval( 'DayOfYear', 352, AnimT3 ),
      Tval( 'DateTime', 352.5, 0 ),

      Ttxt( 'December Solstice Northpole' ),
      Tval( 'ObserverLat', 90, AnimT3 ),
      Tval( 'DateTime', 353.5, AnimT3 ),
      Ttxt( 'December Solstice Northpole: 24 h Darkness' ),
      Tval( 'DateTime', 355.5, AnimT6 ),
      Tval( 'DateTime', 352.5, 0, AnimT1 ),
      Tpse(),
    ],
  }
);

Demos.AddState(
  'FeDomeApp = { "Description": "December Solstice Northpole: 24 h Darkness", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": 90, "ObserverLong": 15, "Zoom": 1.9, "CameraDirection": 45, "CameraHeight": 15, "CameraDistance": 200150, "DateTime": 352.5, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": false, "ShowShadow": true, "ShowDomeGrid": true, "ShowSunTrack": true, "ShowMoonTrack": false, "ShowSphere": true, "ShowStars": false, "ShowDomeRays": true, "ShowSphereRays": true, "ShowManyRays": false }'
);


Demos.AddAnimation(
  {
    Mode: 'serial',
    TaskList: [
      Ttxt( 'December Solstice Antarctica' ),
      Tval( 'ObserverLat', -90, AnimT3 ),
      Tval( 'DateTime', 353.5, AnimT5 ),
      Ttxt( 'December Solstice Antarctica: 24 h Sunlight' ),
      Tval( 'DateTime', 355.9583, 2*AnimT10 ),
      Tpse(),
    ],
  }
);

Demos.AddState(
  'FeDomeApp = { "Description": "December Solstice Antarctica: 24 h Sunlight", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": -90, "ObserverLong": 15, "Zoom": 1.9, "CameraDirection": 45, "CameraHeight": 15, "CameraDistance": 200150, "DateTime": 355.9583, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": false, "ShowShadow": true, "ShowDomeGrid": true, "ShowSunTrack": true, "ShowMoonTrack": false, "ShowSphere": true, "ShowStars": false, "ShowDomeRays": true, "ShowSphereRays": true, "ShowManyRays": false }'
);

Demos.AddAnimation(
  {
    Mode: 'serial',
    TaskList: [
      Ttxt( 'Sunrays have to bend over the Shadow to the opposite side of the North Pole!' ),
      Tval( 'CameraDirection', 15, AnimT3 ),
      Tval( 'CameraDirection', -15, AnimT3, AnimT1 ),
      Tval( 'CameraDirection', 45, AnimT5, AnimT1 ),

      Tval( 'Zoom', 1.6, AnimT2, AnimT1 ),
      Tval( 'ShowManyRays', true, 0 ),
      Tval( 'RayTarget', 1, 0 ),
      Tval( 'ShowSunTrack', false, 0 ),

      Tval( 'CameraDirection', 15, AnimT3, AnimT1 ),
      Tval( 'CameraDirection', -15, AnimT3, AnimT1 ),
      {
        Delay: AnimT1,
        Mode: 'parallel',
        TaskList: [
          Tval( 'CameraDirection', 105, AnimT10 ),
          Tval( 'ObserverLat', 35, AnimT5 ),
        ],
      },
      Tval( 'CameraHeight', 89.9, AnimT5, AnimT1 ),
      Tval( 'CameraHeight', 15, AnimT5, AnimT1 ),
    ],
  }
);

Demos.AddState(
  'FeDomeApp = { "Description": "Sunrays have to bend over the Shadow to the opposite side of the North Pole!", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": 35, "ObserverLong": 15, "Zoom": 1.6, "CameraDirection": 105, "CameraHeight": 15, "CameraDistance": 200150, "DateTime": 355.9583, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": false, "ShowShadow": true, "ShowDomeGrid": true, "ShowSunTrack": false, "ShowMoonTrack": false, "ShowSphere": true, "ShowStars": false, "ShowDomeRays": true, "ShowSphereRays": true, "ShowManyRays": true, "RayParameter": 1, "RayTarget": 1, "RaySource": 0 }'
);


// Stars Demo

Demos.New( 'Stars' );

Demos.AddState(
  'FeDomeApp = { "Description": "", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": 45, "ObserverLong": -100, "Zoom": 1.25, "CameraDirection": -35, "CameraHeight": 25, "CameraDistance": 200150, "DateTime": 78, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": false, "ShowShadow": false, "ShowDomeGrid": true, "ShowSunTrack": false, "ShowMoonTrack": false, "ShowSphere": true, "ShowStars": false, "ShowDomeRays": false, "ShowSphereRays": false, "ShowManyRays": false }'
);

Demos.AddAnimation(
  {
    Mode: 'serial',
    TaskList: [
      Ttxt( 'Lets see how Starlight has to bend to produce correct Startrails.' ),
      Tval( 'ShowStars', true, 0, AnimT2 ),
      {
        Mode: 'parallel',
        TaskList: [
          Tval( 'CameraDirection', -85, AnimT2 ),
          Tval( 'CameraHeight', 4, AnimT2 ),
          Tval( 'Zoom', 3, AnimT2 ),
        ],
      },
      Tpse(),
    ],
  }
);

Demos.AddState(
  'FeDomeApp = { "Description": "Lets see how Starlight has to bend to produce correct Startrails.", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": 45, "ObserverLong": -100, "Zoom": 3, "CameraDirection": -85, "CameraHeight": 4, "CameraDistance": 200150, "DateTime": 78, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": false, "ShowShadow": false, "ShowDomeGrid": true, "ShowSunTrack": false, "ShowMoonTrack": false, "ShowSphere": true, "ShowStars": true, "ShowDomeRays": false, "ShowSphereRays": false, "ShowManyRays": false }'
);

Demos.AddAnimation(
  {
    Mode: 'serial',
    TaskList: [
      Ttxt( 'The Observer sees the Stars rotate around one Celestial Pole: Elevation = Observer Latitude.' ),
      {
        Mode: 'parallel',
        TaskList: [
          Tval( 'DateTime', 82, 4*AnimT8, 0, 'linear' ),

          Tval( 'Description', 'North of the Equator the Stars rotate Anti-Clockwise around Polaris', 0, AnimT8 ),
          Tpnt( 'Polaris', [473,185], [530,124], AnimT8 ),

          Tpnt( 2*AnimT8 ),
          Tval( 'Description', 'At the Equator the Stars rotate around 2 Poles at the Horizon.', 0, 2*AnimT8 ),
          Tval( 'ObserverLat', 0, AnimT3, 2*AnimT8 ),
          Tval( 'CameraDirection', -50, AnimT3, 2*AnimT8 ),

          Tval( 'Description', 'South of the Equator the Stars rotate Clockwise around a Celestial Pole due South.', 0, 3*AnimT8 ),
          Tval( 'ObserverLat', -45, AnimT3, 3*AnimT8 ),
          Tval( 'CameraDirection', 80, AnimT3, 3*AnimT8 ),
        ],
      },
      Tpse(),
    ],
  }
);

Demos.AddState(
  'FeDomeApp = { "Description": "South of the Equator the Stars rotate Clockwise around a Celestial Pole due South.", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": -45, "ObserverLong": -100, "Zoom": 3, "CameraDirection": 80, "CameraHeight": 4, "CameraDistance": 200150, "DateTime": 82, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": false, "ShowShadow": false, "ShowDomeGrid": true, "ShowSunTrack": false, "ShowMoonTrack": false, "ShowSphere": true, "ShowStars": true, "ShowDomeRays": false, "ShowSphereRays": false, "ShowManyRays": false }'
);

Demos.AddAnimation(
  {
    Mode: 'serial',
    TaskList: [
      Ttxt( 'This are the Light Rays to the Stars on the Observer\'s Celestial Sphere:' ),
      Tval( 'ShowSphereRays', true, 0 ),
      Tval( 'ShowManyRays', true, 0 ),
      {
        Mode: 'parallel',
        TaskList: [
          Tval( 'DateTime', 90, 8*AnimT8, 0, 'linear' ),

          Tval( 'Description', 'This are the Lightrays to the corresponding Stars on the Dome.', 0, AnimT8 ),
          Tval( 'ShowDomeRays', true, 0, AnimT8 ),

          Tval( 'Zoom', 1, AnimT5, 2*AnimT8 ),
          Tval( 'CameraHeight', 89.9, AnimT5, 2*AnimT8 ),
          Tval( 'ShowSphereRays', false, 0, 2*AnimT8 ),

          Tval( 'Zoom', 1.4, AnimT5, 3*AnimT8 ),
          Tval( 'CameraHeight', 25, AnimT5, 3*AnimT8 ),
          Tval( 'CameraDirection', -35, AnimT5, 3*AnimT8 ),

          Tval( 'CameraDirection', -100, AnimT5, 4*AnimT8 ),

          Tval( 'CameraDirection', 300, 2*AnimT10, 5*AnimT8 ),
        ],
      },
    ],
  }
);

Demos.AddState(
  'FeDomeApp = { "Description": "This are the Lightrays to the corresponding Stars on the Dome.", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": -45, "ObserverLong": 260, "Zoom": 1.4, "CameraDirection": 300, "CameraHeight": 25, "CameraDistance": 200150, "DateTime": 92, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": false, "ShowShadow": false, "ShowDomeGrid": true, "ShowSunTrack": false, "ShowMoonTrack": false, "ShowSphere": true, "ShowStars": true, "ShowDomeRays": true, "ShowSphereRays": true, "ShowManyRays": false }'
);

Demos.AddAnimation(
  {
    Mode: 'serial',
    TaskList: [
      {
        Mode: 'parallel',
        TaskList: [
          Tval( 'DateTime', 96, 8*AnimT8, 0, 'linear' ),

          Tval( 'ObserverLat', -90, AnimT4, 1*AnimT8 ),
          Tval( 'ObserverLat', 90, AnimT8, 2*AnimT8 ),
          Tval( 'ObserverLat', 0, AnimT4, 4*AnimT8 ),
          Tval( 'ObserverLat', -61.001, AnimT4, 5*AnimT8 ),
          Tval( 'ObserverLat', -61, 0, 6*AnimT8 ),
        ],
      },
      Tpse(),
    ],
  }
);

Demos.AddState(
  'FeDomeApp = { "Description": "This are the Lightrays to the corresponding Stars on the Dome.", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": -61, "ObserverLong": 260, "Zoom": 1.4, "CameraDirection": 300, "CameraHeight": 25, "CameraDistance": 200150, "DateTime": 96, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": false, "ShowShadow": false, "ShowDomeGrid": true, "ShowSunTrack": false, "ShowMoonTrack": false, "ShowSphere": true, "ShowStars": true, "ShowDomeRays": true, "ShowSphereRays": true, "ShowManyRays": false }'
);

Demos.AddAnimation(
  {
    Mode: 'serial',
    TaskList: [
      Ttxt( 'How can the same southern Star be visible from 3 Continents at the same time looking south?' ),
      Tval( 'ShowShadow', true, 0 ),
      Tval( 'ShowSphere', false, 0 ),
      Tval( 'ShowDomeRays', false, 0 ),
      Tval( 'ShowSphereRays', false, 0 ),
      {
        Mode: 'parallel',
        TaskList: [
          Tval( 'DayOfYear', 172, AnimT2 ),
          Tval( 'ObserverLat', 90, AnimT2 ),
          Tval( 'Zoom', 1, AnimT2 ),
        ],
      },
      Tval( 'ObserverLong', -95, 0 ),
      {
        Delay: 0,
        Mode: 'parallel',
        TaskList: [
          Tval( 'DateTime', 172.9, AnimT3 ),
          Tval( 'CameraDirection', 30, AnimT3 ),
          Tval( 'CameraHeight', 30, AnimT3 ),
        ],
      },
      Tpse(),
    ],
  }
);

Demos.AddState(
  'FeDomeApp = { "Description": "How can the same southern Star be visible from 3 Continents at the same time looking south?", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": 90, "ObserverLong": -95, "Zoom": 1, "CameraDirection": 30, "CameraHeight": 30, "CameraDistance": 200150, "DateTime": 172.9, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": false, "ShowShadow": true, "ShowDomeGrid": true, "ShowSunTrack": false, "ShowMoonTrack": false, "ShowSphere": false, "ShowStars": true, "ShowDomeRays": false, "ShowSphereRays": false, "ShowManyRays": false, "RayParameter": 1, "RayTarget": 0, "RaySource": 2 }'
);

Demos.AddAnimation(
  {
    Mode: 'serial',
    TaskList: [
      Ttxt( 'It can be Night at 3 Continents at the same time at June Solstice.' ),
      Tpnt( 'South America', [300,310], [300,244], AnimT3 ),
      Tpnt( 'Africa', [439,361], [439,293], AnimT2 ),
      Tpnt( 'Australia', [604,280], [604,226], AnimT2 ),
      Tpnt( AnimT2 ),
      Ttxt( 'The same Star can be seen from this Continents looking South at the same time!' ),
      Tval( 'RayTarget', 1, 0, AnimT1 ),
      {
        Delay: 0,
        Mode: 'parallel',
        TaskList: [
          Tval( 'ObserverLat', -70, AnimT3 ),
          Tval( 'Zoom', 1.4, AnimT3 ),
        ],
      },
      Tval( 'ShowFeGrid', true, 0 ),
      Tval( 'ShowDomeGrid', false, 0 ),
      {
        Delay: AnimT2,
        Mode: 'parallel',
        TaskList: [
          Tval( 'CameraDirection', -60, AnimT3 ),
          Tval( 'CameraHeight', 89.9, AnimT3 ),
          Tval( 'Zoom', 1.2, AnimT3 ),
        ],
      },
      Tpnt( 'South-East', [431,447], [415,409], AnimT1 ),
      Tpnt( 'South', [625,252], [565,252], AnimT2 ),
      Tpnt( 'South-West', [429,59], [415,93], AnimT2 ),
      Tpnt( AnimT2 ),
      Tval( 'CameraHeight', 36, AnimT4 ),
      Tval( 'CameraDirection', -150, AnimT3, AnimT2 ),
      Tval( 'CameraDirection', -60, AnimT3, AnimT2 ),
    ],
  }
);

Demos.AddState(
  'FeDomeApp = { "Description": "Use the green Sliders to change the Star Position", "PointerFrom": [ 0, 0 ], "PointerTo": [ 0, 0 ], "PointerText": "", "ObserverLat": -70, "ObserverLong": -95, "Zoom": 1.2, "CameraDirection": -60, "CameraHeight": 36, "CameraDistance": 200150, "DateTime": 172.9, "DomeSize": 1, "DomeHeight": 9000, "ShowFeGrid": true, "ShowShadow": true, "ShowDomeGrid": false, "ShowSunTrack": false, "ShowMoonTrack": false, "ShowSphere": false, "ShowStars": true, "ShowDomeRays": false, "ShowSphereRays": false, "ShowManyRays": false, "RayParameter": 1, "RayTarget": 1, "RaySource": 2 }'
);

</jscript>

{{scroll}}

<jscript>

// ---------------- create control panels -------------------------

function ParseTimeField( s ) {
  if (s == 'now') {
    d = new Date();
    return 24 * ((d.getTime() / FeDomeApp.msPerDay - FeDomeApp.ZeroDate) % 1.0);
  } else {
    return NumFormatter.HmsStrToNum( s );
  }
}

function ParseDateField( s ) {
  if (s == 'now') {
    d = new Date();
    return Math.floor( d.getTime() / FeDomeApp.msPerDay - FeDomeApp.ZeroDate );
  } else {
    return NumFormatter.DateStrToNum( s, FeDomeApp.ZeroDate );
  }
}

ControlPanels.NewSliderPanel( {
  Name: 'SliderPanel',
  ModelRef: 'FeDomeApp',
  NCols: 1,
  ValuePos: 'left',
  OnModelChange: UpdateAll,
  Format: 'fix0',
  Digits: 2,
  ReadOnly: false,
  PanelFormat: 'InputMediumWidth'

} ).AddValueSliderField( {
  Name: 'Time',
  Label: 'Time',
  Units: 'h',
  Color: 'black',
  Min: 0,
  Max: 48,
  ConvToModelFunc: function(s) { return ParseTimeField( s ); },

} ).AddValueSliderField( {
  Name: 'DayOfYear',
  Units: 'd',
  Color: 'black',
  Min: 0,
  Max: 2000,
  Steps: 2000,
  Digits: 0,
  ConvToModelFunc: function(s) { return ParseDateField( s ); },

} ).AddValueSliderField( {
  Name: 'ObserverLat',
  Color: 'green',
  Min: -90,
  Max: 90,
  Units: '&deg;',
  Digits: 6,
  Format: 'std',
  ConvToModelFunc: function(s) { return NumFormatter.DmsStrToNum( s ); },

} ).AddValueSliderField( {
  Name: 'ObserverLong',
  Color: 'green',
  Min: -180,
  Max: 180,
  Units: '&deg;',
  Digits: 6,
  Format: 'std',
  ConvToModelFunc: function(s) { return NumFormatter.DmsStrToNum( s ); },

} ).AddValueSliderField( {
  Name: 'CameraDirection',
  Label: 'CameraDir',
  Color: 'red',
  Units: '&deg;',
  Min: -360,
  Max: 360,
  Inc: 1,

} ).AddValueSliderField( {
  Name: 'CameraHeight',
  Label: 'CameraHeight',
  Color: 'red',
  Units: '&deg;',
  Min: 0,
  Max: 89.9,
  Inc: 1,

} ).AddValueSliderField( {
  Name: 'Zoom',
  Label: 'Zoom',
  Color: 'orange',
  Mult: 0.01,
  Units: '%',
  Inc: 1,
  Min: FeDomeApp.ZoomMin,
  Max: FeDomeApp.ZoomMax,

} ).AddValueSliderField( {
  Name: 'DomeHeight',
  Color: 'blue',
  Units: 'km',
  Min: FeDomeApp.DomeHeightMin,
  Max: FeDomeApp.DomeHeightMax,
  Inc: 100,

} ).AddValueSliderField( {
  Name: 'DomeSize',
  Label: 'DomeSize',
  Color: 'blue',
  Mult: 0.01,
  Units: '%',
  Min: 1,
  Max: 5,
  Inc: 10,

} ).AddValueSliderField( {
  Name: 'RayParameter',
  Label: 'RayParam',
  Color: 'magenta',
  Mult: 0.01,
  Units: '%',
  Min: 0.5,
  Max: 2.0,
  Inc: 0.1,

} ).Render();

</jscript>

{{end scroll}}

{{scroll}}

<jscript>

ControlPanels.NewPanel( {
  Name: 'OptionPanel',
  ModelRef: 'FeDomeApp',
  NCols: 2,
  OnModelChange: UpdateAll,
  Format: 'fix0',
  FormatTab: true,
  Digits: 2,
  PanelFormat: 'InputNormalWidth'

} ).AddCheckboxField( {
  Name: 'Show',
  NCols: 5,
  ColSpan: 3,
  Items: [
    {
      Name: 'ShowFeGrid',
      Text: 'FE Grid',
    }, {
      Name: 'ShowDomeGrid',
      Text: 'Dome Grid',
    }, {
      Name: 'ShowShadow',
      Text: 'Shadow',
    }, {
      Name: 'ShowSunTrack',
      Text: 'Sun Track',
    }, {
      Name: 'ShowMoonTrack',
      Text: 'Moon Track',
    }, {
      Name: 'ShowSphere',
      Text: 'Sphere',
      EnabledRef: 'IsRayTargetObserver',
    }, {
      Name: 'ShowStars',
      Text: 'Stars',
      EnabledRef: 'IsRayTargetObserver',
    }, {
      Name: 'ShowDomeRays',
      Text: 'Dome Rays',
      EnabledRef: 'IsRayTargetObserver',
    }, {
      Name: 'ShowSphereRays',
      Text: 'Sphere Rays',
      EnabledRef: 'IsRayTargetObserver',
    }, {
      Name: 'ShowManyRays',
      Text: 'Many Rays',
      EnabledRef: 'ManyRaysEnabled',
    }
  ]

} ).AddRadiobuttonField( {
  Name: 'RayTarget',
  ValueType: 'int',
  ColSpan: 1,
  Items: [
    {
      Name: 'Observer',
      Value: 0
    }, {
      Name: 'FlatEarth',
      Value: 1
    }
  ]

} ).AddRadiobuttonField( {
  Name: 'RaySource',
  ValueType: 'int',
  ColSpan: 1,
  EnabledRef: 'RayTarget',
  Items: [
    {
      Name: 'Sun',
      Value: 0
    }, {
      Name: 'Moon',
      Value: 1
    }, {
      Name: 'Star',
      Value: 2
    }
  ]

} ).Render();

</jscript>

{{end scroll}}

{{OnOff|Show Save-Restore Panel|Hide Save-Restore Panel|noborder|$SaveRestorePanel}}

{{form textarea|SaveRestorePanel|8|spellcheck=false|class=ListingDisplay|}}

[javascript:void DataX.GetAppState(true)|{{ButtonText|Get App State|blue}}]
[javascript:void DataX.GetAppStateUrl(ThisPageUrl)|{{ButtonText|Get App Url|blue}}]
[javascript:void DataX.SetAppState()|{{ButtonText|Set App State|green}}]
[javascript:void DataX.ClearSaveRestoreDomObj()|{{ButtonText|Clear|red}}]

{{OnOffEnd}}
