// Practica 5 GPC - Luces y Materiales 

// var globales
var renderer, scene, camera, miniCamera;
var cameraControls;
var gui;

// materiales de las piezas  
var materiales = [];

// mapa de entorno (cube map)
var entorno;

// piezas del robot 
var robot, base, brazo, antebrazo, pinza, dedoIz, dedoDe;

// valores de la interfaz
var controls = {
  giroBase: 0,
  giroBrazo: 0,
  giroAntebrazoY: 0,
  giroAntebrazoZ: 0,
  giroPinza: 0,
  separacion: 10,
  alambres: false,
  anima: function () {
    TWEEN.removeAll();   // por si ya habia una animacion en marcha
    const reposo = { giroBase: 0, giroBrazo: 0, giroAntebrazoY: 0, giroAntebrazoZ: 0, giroPinza: 0, separacion: 10 };
    const refresca = function () { gui.controllersRecursive().forEach(c => c.updateDisplay()); };

    const t1 = new TWEEN.Tween(controls)
      .to({ giroBase: 120, giroBrazo: 30, giroAntebrazoY: 90 }, 1500)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onUpdate(refresca);

    const t2 = new TWEEN.Tween(controls)
      .to({ giroAntebrazoZ: 60, giroPinza: 180, separacion: 4 }, 1500)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onUpdate(refresca);

    const t3 = new TWEEN.Tween(controls)
      .to(reposo, 1500)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onUpdate(refresca);

    t1.chain(t2);
    t2.chain(t3);
    t1.start();
  }
};


init();
loadScene();
render();


function init()
{
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setClearColor( new THREE.Color(0xAADDFF) );
  // activar el calculo de shadowmap 
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;   // bordes de sombra suaves
  document.getElementById('container').appendChild( renderer.domElement );

  scene = new THREE.Scene();

  var aspectRatio = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera( 50, aspectRatio, 1, 5000 );
  camera.position.set( 220, 180, 320 );

  miniCamera = new THREE.OrthographicCamera(-150, 150, 150, -150, 0, 1000);
  miniCamera.position.set(0, 300, 0);
  miniCamera.lookAt(0, 0, 0);
  miniCamera.up.set( 0, 0, 1 );
  miniCamera.updateProjectionMatrix();

  cameraControls = new THREE.OrbitControls( camera, renderer.domElement );
  cameraControls.target.set( 0, 110, 0 );

  // interfaz de controles con lil-gui
  gui = new lil.GUI({ title: 'Control Robot' });
  gui.add(controls, 'giroBase', -180, 180).name('Giro Base');
  gui.add(controls, 'giroBrazo', -45, 45).name('Giro Brazo');
  gui.add(controls, 'giroAntebrazoY', -180, 180).name('Giro Antebrazo Y');
  gui.add(controls, 'giroAntebrazoZ', -90, 90).name('Giro Antebrazo Z');
  gui.add(controls, 'giroPinza', -40, 220).name('Giro Pinza');
  gui.add(controls, 'separacion', 0, 15).name('Separacion Pinza');
  gui.add(controls, 'alambres').name('Alambres');
  gui.add(controls, 'anima').name('Anima');

  // teclado para mover el robot con las flechas
  document.addEventListener('keydown', function (e) {
    switch (e.key) {
      case 'ArrowUp':    robot.position.z -= 5; break;
      case 'ArrowDown':  robot.position.z += 5; break;
      case 'ArrowLeft':  robot.position.x -= 5; break;
      case 'ArrowRight': robot.position.x += 5; break;
    }
  });

  window.addEventListener('resize', updateAspectRatio );
}


function loadScene()
{

  // Carga de texturas 
  const RUTA = 'images/';
  const loader = new THREE.TextureLoader();

  // Mapa de entorno
  // +X, -X, +Y, -Y, +Z, -Z
  entorno = new THREE.CubeTextureLoader().setPath(RUTA).load(
    ['posx.jpg', 'negx.jpg', 'posy.jpg', 'negy.jpg', 'posz.jpg', 'negz.jpg']
  );


  // Habitacion con una textura por cara
 
  const carasHabitacion = ['posx.jpg', 'negx.jpg', 'posy.jpg', 'negy.jpg', 'posz.jpg', 'negz.jpg']
    .map(function (fichero) {
      const t = loader.load(RUTA + fichero);
      // vistas desde dentro, hace falta girarlas en X
      t.wrapS = THREE.RepeatWrapping;
      t.repeat.x = -1;
      t.offset.x =  1;
      return new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide });
    });
  const habitacion = new THREE.Mesh(new THREE.BoxGeometry(2000, 2000, 2000), carasHabitacion);
  scene.add(habitacion);

  // Texturas de las piezas
  const texSuelo = loader.load(RUTA + 'pisometalico_1024.jpg');
  texSuelo.wrapS = texSuelo.wrapT = THREE.RepeatWrapping;
  texSuelo.repeat.set(10, 10);                 

  const texMetal = loader.load(RUTA + 'metal_128.jpg');
  texMetal.wrapS = texMetal.wrapT = THREE.RepeatWrapping;
  texMetal.repeat.set(2, 2);

  const texMadera = loader.load(RUTA + 'wood512.jpg');
  texMadera.wrapS = texMadera.wrapT = THREE.RepeatWrapping;

  // Materiales
  // suelo con reflejo
  const matSuelo = new THREE.MeshPhongMaterial({
    map: texSuelo
  });

  // base + esparrago + eje de metal con Phong
  const matMetal = new THREE.MeshPhongMaterial({
    map: texMetal,
    envMap: entorno, reflectivity: 0.35,
    specular: 0x888888, shininess: 40
  });

  // discos, nervios y mano de madera con Lambert
  const matMadera = new THREE.MeshLambertMaterial({ map: texMadera });

  // Pinza de metal con brillo apagado, reflejo y Phong
  const matPinza = new THREE.MeshPhongMaterial({
    map: texMetal, envMap: entorno, reflectivity: 0.35,
    specular: 0x888888, shininess: 40
  });

  // Rotula reflectante de color cobre.
  // combine = MultiplyOperation hace que el reflejo del entorno se tiña de cobre.
  const matRotula = new THREE.MeshPhongMaterial({
    color: 0xA0623A,
    envMap: entorno, reflectivity: 1.0, combine: THREE.MultiplyOperation,
    specular: 0xffcc99, shininess: 100
  });

  // Materiales que responden al check "Alambres"
  materiales.push(matMetal, matMadera, matPinza, matRotula);

  // Suelo
  const suelo = new THREE.Mesh( new THREE.PlaneGeometry(2000, 2000), matSuelo );
  suelo.rotation.x = -Math.PI / 2;
  suelo.receiveShadow = true;        // el suelo recibe las sombras del robot
  scene.add(suelo);

  // Robot 
  robot = new THREE.Object3D();

  // base
  base = new THREE.Mesh(new THREE.CylinderGeometry(50, 50, 15, 100), matMetal);
  base.position.y = 7.5;
  robot.add(base);

  // brazo
  brazo = new THREE.Object3D();
  brazo.position.y = 7.5;

  const esparrago = new THREE.Mesh( new THREE.BoxGeometry(18, 120, 12), matMetal);
  esparrago.position.y = 60;
  brazo.add(esparrago);

  const eje = new THREE.Mesh(new THREE.CylinderGeometry(20,20, 18,32), matMetal);
  eje.rotation.x = -Math.PI / 2;
  eje.position.y = -7.5;
  brazo.add(eje);

  const rotula = new THREE.Mesh(new THREE.SphereGeometry(20,20,20), matRotula);
  rotula.position.y = 120;
  brazo.add(rotula);

  base.add(brazo);

  // antebrazo
  antebrazo = new THREE.Object3D();
  antebrazo.position.y = 120;

  const discos = new THREE.Mesh(new THREE.CylinderGeometry(22,22,6,32), matMadera);
  antebrazo.add(discos);

  for (let x of [-8, 8]) {
    for (let z of [-8, 8]) {
      const nervio = new THREE.Mesh(new THREE.BoxGeometry(4, 80, 4), matMadera);
      nervio.position.set(x, 46, z);
      antebrazo.add(nervio);
    }
  }

  const mano = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 40, 32), matMadera);
  mano.rotation.x = Math.PI / 2;
  mano.position.y = 80+6;
  antebrazo.add(mano);

  brazo.add(antebrazo);

  // pinza
  pinza = new THREE.Object3D();
  mano.add(pinza);

  // soporte para los dedos
  const soporte = new THREE.Object3D();
  soporte.rotation.x = -Math.PI / 2;
  pinza.add(soporte);

  const geoCaja = new THREE.BoxGeometry(19, 20, 4);
  const geoCuna = new THREE.BufferGeometry();

  const posiciones = [
     19,-10,-2,   19,-10, 2,   19, 10, 2,   19, 10,-2,   // base
     38, -6, 0,   38, -6,-2,   38,  6,-2,   38,  6, 0,   // punta
     19,-10,-2,   19, 10,-2,   38,  6,-2,   38, -6,-2,   // interior
     19,-10, 2,   38, -6, 0,   38,  6, 0,   19, 10, 2,   // exterior
     19, 10,-2,   19, 10, 2,   38,  6, 0,   38,  6,-2,   // arriba
     19,-10,-2,   38, -6,-2,   38, -6, 0,   19,-10, 2    // abajo
  ];

  const indices = [
     0, 1, 2,    0, 2, 3,    // base
     4, 5, 6,    4, 6, 7,    // punta
     8, 9,10,    8,10,11,    // interior
    12,13,14,   12,14,15,    // exterior
    16,17,18,   16,18,19,    // arriba
    20,21,22,   20,22,23     // abajo
  ];

  geoCuna.setAttribute( 'position', new THREE.Float32BufferAttribute(posiciones, 3) );
  geoCuna.setIndex( indices );
  geoCuna.computeVertexNormals();

  // dedo izquierdo
  dedoIz = new THREE.Object3D();
  const caja = new THREE.Mesh( geoCaja, matPinza);
  caja.position.x = 19 / 2;
  dedoIz.add(caja);
  dedoIz.add(new THREE.Mesh( geoCuna, matPinza));
  dedoIz.position.set( 0, 0, 10 );
  soporte.add(dedoIz);

  // dedo derecho
  dedoDe = dedoIz.clone();
  dedoDe.position.set(0, 0, -10);
  dedoDe.rotation.x = Math.PI;
  soporte.add(dedoDe);

  // sombras para las piezas del robot
  robot.traverse(function (obj) {
    if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; }
  });

  scene.add(robot);

  // 6) Luces  (ambiental + direccional + focal, con sombras)
  // Ambiental: ilumina todo por igual, rellena las zonas en sombra.
  const ambiental = new THREE.AmbientLight(0x404040);
  scene.add(ambiental);

  // Direccional: rayos paralelos -> sombra principal nitida.
  const direccional = new THREE.DirectionalLight(0xffffff, 0.5);
  direccional.position.set(300, 400, 200);
  direccional.castShadow = true;
  direccional.shadow.mapSize.set(2048, 2048);

  direccional.shadow.camera.left   = -400;
  direccional.shadow.camera.right  =  400;
  direccional.shadow.camera.top    =  400;
  direccional.shadow.camera.bottom = -400;
  direccional.shadow.camera.near   = 1;
  direccional.shadow.camera.far    = 1500;
  scene.add(direccional);

  // Focal: cono de luz -> segunda sombra arrojada, más marcada.
  const focal = new THREE.SpotLight(0xffffff, 1);
  focal.position.set(-250, 450, 250);
  focal.target.position.set(0, 100, 0);    // apunta al robot
  focal.angle    = Math.PI / 7;            // apertura del cono
  focal.penumbra = 0.3;                    // borde del cono difuminado
  focal.decay    = 1;                      // atenuacion suave (escena grande)
  focal.distance = 0;                      // sin limite de alcance
  focal.castShadow = true;
  focal.shadow.mapSize.set(2048, 2048);
  focal.shadow.camera.near = 50;
  focal.shadow.camera.far  = 1200;
  scene.add(focal);
  scene.add(focal.target);                 // el target debe estar en la escena
}


function updateAspectRatio()
{
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}


function update()
{
  cameraControls.update();

  TWEEN.update();   // avanza las animaciones del boton "Anima"

  // aplicar los controles a cada pieza (grados -> radianes)
  base.rotation.y      = controls.giroBase       / 180 * Math.PI;
  brazo.rotation.z     = controls.giroBrazo      / 180 * Math.PI; 
  antebrazo.rotation.y = controls.giroAntebrazoY / 180 * Math.PI;
  antebrazo.rotation.z = controls.giroAntebrazoZ / 180 * Math.PI;
  pinza.rotation.y     = controls.giroPinza      / 180 * Math.PI;    
  dedoIz.position.z =  controls.separacion;        
  dedoDe.position.z = -controls.separacion;
  for (const m of materiales) m.wireframe = controls.alambres;
}


function render()
{
  requestAnimationFrame( render );
  update();
      renderer.autoClear = false;
    renderer.setViewport(0,0,window.innerWidth,window.innerHeight);
	renderer.setClearColor( new THREE.Color(0xa2a2f2) );
	renderer.clear();
	renderer.render( scene, camera );

    // vista de arriba
    var ds = Math.min(window.innerHeight , window.innerWidth)/4;
    renderer.setViewport(0,window.innerHeight-ds,ds,ds);
	renderer.setScissor (0, window.innerHeight-ds, ds, ds);
	renderer.setScissorTest (true);
	renderer.setClearColor( new THREE.Color(0xaffff) );
	renderer.clear();
	renderer.setScissorTest (false);
    renderer.render(scene, miniCamera);
}
