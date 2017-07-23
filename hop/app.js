import {
	Plane,
	Engine,
	Scene,
	HemisphericLight,
	Vector3,
	Color3,
	FreeCamera,
	ArcRotateCamera,
	Mesh,
	MeshBuilder,
	PhysicsImpostor,
	CannonJSPlugin,
	Texture,
	StandardMaterial,
	ShadowGenerator,
	DirectionalLight,
	Color4,
	CSG,
	Animation,
	AnimationEvent,
	FxaaPostProcess
} from 'babylonjs';

import CANNON from 'cannon';
window.CANNON = CANNON;

const canvas = document.getElementById("stage");
const engine = new Engine(canvas);
const scene = new Scene(engine);
const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
let started = false;
let renderScene = true;
light.intensity = 0.5;
const camera = new ArcRotateCamera("ArcRotateCamera", Math.PI/2, Math.PI/2, 10, new Vector3(0, 4, -40), scene);
camera.attachControl(canvas, false);
camera.setTarget(Vector3.Zero());
camera.applyGravity = true;
const sphere = MeshBuilder.CreateSphere("ball", {
	diameter: 1
}, scene);
sphere.position.z = -16;
sphere.position.y = 0.7;
const postProcess = new FxaaPostProcess("fxaa", 1.0, camera);
const boxes=[];
const ground = Mesh.CreateGround("ground1", 12, 40, 2, scene);
const materialGround1 = new StandardMaterial("texture2", scene);
ground.receiveShadows = true;
ground.material = materialGround1;
materialGround1.emissiveColor = new Color3(0.5,0.2,1);
let sceneAnimations = [];
let currentBox;
// droping animation
const droppingKeys = [];
droppingKeys.push({
	frame: 0,
	value: 3
});
droppingKeys.push({
	frame: 20,
	value: 0
});
droppingKeys.push({
	frame: 300,
	value: 0
});

// opacity animation
const opacityKeys = [];
opacityKeys.push({
	frame: 0,
	value: 0
});
opacityKeys.push({
	frame: 20,
	value: 1
});
opacityKeys.push({
	frame: 300,
	value: 1
});

// jump animation
const jumpKeys = [];
let nextBox = 1;
jumpKeys.push({
	frame: 0,
	value: 0.7
});
jumpKeys.push({
	frame: 18,
	value: 3
});
jumpKeys.push({
	frame: 35,
	value: 0.5
});
jumpKeys.push({
	frame: 40,
	value: 0.5
});
jumpKeys.push({
	frame: 70,
	value: -50
});

scene.enablePhysics();
sphere.physicsImpostor = new PhysicsImpostor(sphere, PhysicsImpostor.SphereImpostor, { mass: 0, restitution:0 }, scene);
const xPositions = [-3.5, -2.5, 0, 2.5, 3.5];
let startPosition = -16;
let jumpAnimationRef;
//box
for(let i=0; i<10; i++){
	const box = MeshBuilder.CreateBox('box1', {
		size: 2,
		height:0.4,
		faceColors: new Color4(0,0,1,0.8),
	},scene);
	const boxMaterial = new StandardMaterial('boxMaterial', scene);
	boxes.push(box);
	box.checkCollisions = true;
	box.physicsImpostor = new PhysicsImpostor(box, PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0 }, scene);
	box.material = boxMaterial;
	boxMaterial.diffuseColor = new Color3(0.301, 0.815, 1);
	boxMaterial.ambientColor = new Color3(0.101, 0.715, 1);
	const newXPosition = xPositions[Math.floor(Math.random() * 4)];
	box.position.z = startPosition;
	box.startPosition = startPosition;
	startPosition += 4;

	if (i > 0) {
		box.physicsImpostor = new PhysicsImpostor(box, PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0 }, scene);
		// box.physicsImpostor.registerOnPhysicsCollide(sphere.physicsImpostor, function(main, collided) {
		// 	console.log(jumpAnimationRef, 'pausing');
		// 	jumpAnimationRef.pause();
		// 	sphere.animations = [];
		// });
	}
}


// setup
scene.clearColor = new Color3(255,255,255);
scene.gravity = new Vector3(0, 0, 0);

//ground.physicsImpostor = new PhysicsImpostor(ground, PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0 }, scene);


scene.collisionsEnabled = true;
ground.checkCollisions = true;
sphere.checkCollisions = true;
scene.registerBeforeRender(function () {
	if (currentBox && sphere.intersectsMesh(currentBox, false)) {
		jumpAnimationRef.pause();
		sphere.position.y =0.7;
		const jumpAnimation = new Animation("jumpAnimation", "position.y", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
		const movingAnimation = new Animation("movingAnimation", "position.z", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
		jumpAnimation.setKeys(jumpKeys);
		currentBox = getNextIntersectingBox();
		const nextZPosition = currentBox.position.z;
		movingAnimation.setKeys(getMovementKeys(sphere.position.z, nextZPosition));
		sphere.animations.push(jumpAnimation);
		sphere.animations.push(movingAnimation);
		jumpAnimationRef = scene.beginAnimation(sphere, 0, 70, false);
	}
});
engine.runRenderLoop(function () {
	scene.render();
});

document.addEventListener('click', ()=>{
	if (!started) {
		started = true;
		const jumpAnimation = new Animation("jumpAnimation", "position.y", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
		const movingAnimation = new Animation("movingAnimation", "position.z", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
		jumpAnimation.setKeys(jumpKeys);
		currentBox = getNextIntersectingBox();
		const nextZPosition = currentBox.position.z;
		movingAnimation.setKeys(getMovementKeys(sphere.position.z, nextZPosition));
		sphere.animations.push(jumpAnimation);
		sphere.animations.push(movingAnimation);

		jumpAnimationRef = scene.beginAnimation(sphere, 0, 70, false);
	}
});

function getMovementKeys (currentPoint, destination) {
	//animation keys
	console.log(currentPoint, destination);
	const movementKeys = [];
	movementKeys.push({
		frame: 0,
		value: currentPoint
	});
	movementKeys.push({
		frame: 35,
		value: destination
	});

	return movementKeys;
}

function getTravelTime(startPoint) {
	const speed = 280/ 40;
	const distance = startPoint - -20;
	return distance * speed;
}

function addLoopedAnimation(box) {
	const movingAnimation = new Animation("movingAnimation", "position.z", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
	const droppingAnimation = new Animation("droppingAnimation", "position.y", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
	const opacityAnimation = new Animation("opacityAnimation", "material.alpha", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
	box.position.z = 20;
	movingAnimation.setKeys(getMovementKeys(box.position.z));
	droppingAnimation.setKeys(Object.assign([],droppingKeys));
	opacityAnimation.setKeys(Object.assign([],opacityKeys));

	const animationEndEvent = new AnimationEvent(299, function(e) {
		const newXPosition = xPositions[Math.floor(Math.random() * 4)];
		//box.position.x = newXPosition;
	});

	movingAnimation.addEvent(animationEndEvent);

	box.animations = [];
	box.animations.push(movingAnimation);
	box.animations.push(droppingAnimation);
	box.animations.push(opacityAnimation);
	sceneAnimations.push(scene.beginAnimation(box, 0, 300, true));
}


function getNextIntersectingBox(){
	const nextBoxObj =  boxes[nextBox];

	if(nextBox <  9) {
		nextBox++;
	} else {
		nextBox = 0;
	}
	return nextBoxObj;
}