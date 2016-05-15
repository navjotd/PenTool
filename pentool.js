//this is very, very rare. Please treat it with care.
function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

var Pentool = {};

Pentool.BaseModel = function() {
	this.observers = [];
}

Pentool.BaseModel.prototype.addObserver = function(view) {
	if (view) {
		this.observers.push(view);	
	}	
}

Pentool.BaseModel.prototype.updateObservers = function() {
	for (var i = 0; i < this.observers.length; i++) {
		this.observers[i].update(this);
	}
}

Pentool.BezierSegment = function(p0, p1, p2, p3) {
	this.controlPoints = [];
	this.controlPoints[0] = p0;
	this.controlPoints[1] = p1;
	this.controlPoints[2] = p2;
	this.controlPoints[3] = p3;
}

Pentool.BezierSegment.prototype.setP = function(index, p) {
	if (index >= 0 && index < this.controlPoints.length) {
		this.controlPoints[index] = p;
	}
}

Pentool.BezierSegment.prototype.getP = function(index) {
	if (index >= 0 && index < this.controlPoints.length) {
		return this.controlPoints[index];
	}

	return null;
}

Pentool.Selection = function(p2, p3, q1, lIndex, rIndex) {
	this.leftIndex = lIndex;
	this.rightIndex = rIndex;
	this.p2 = p2;
	this.p3 = p3;
	this.q1 = q1;
	this.selectedNode = 3;
}

Pentool.inRange = function(arg, num, r) {
	return Math.abs(arg - num) <= r;
}

Pentool.Model = function() {
	//constructor for the model
	Pentool.BaseModel.apply(this, null);
	this.segments = [];
	this.numSegments = 0;
	this.selection = null;
	this.previousPoint = null;
}

Pentool.Model.prototype = Object.create(Pentool.BaseModel.prototype);

Pentool.Model.prototype._addSegment = function(seg) {
	this.segments.push(seg);
	this.numSegments = this.numSegments + 1;
}

Pentool.Model.prototype.editSelection = function(x, y) {
	var inRange = Pentool.inRange;
	if (this.selection.p3 && inRange(this.selection.p3.elements[0], x, 5) && inRange(this.selection.p3.elements[1], y, 5)) {
		//do nothing
		this.selection.selectedNode = 3;
		return true;
	}

	if (this.selection.p2 && inRange(this.selection.p2.elements[0], x, 5) && inRange(this.selection.p2.elements[1], y, 5)) {
		//do nothing
		this.selection.selectedNode = 2;
		return true;
	}

	if (this.selection.q1 && inRange(this.selection.q1.elements[0], x, 5) && inRange(this.selection.q1.elements[1], y, 5)) {
		//do nothing
		this.selection.selectedNode = 1;
		return true;
	}

	return false;
}

Pentool.Model.prototype.makeSelection = function(x, y) {
	//debugger;
	var result = false;
	var inRange = Pentool.inRange;
	if (this.selection) {
		result = this.editSelection(x, y);
		if (result) {
			//debugger;
			this.updateObservers(this);
			return true;
		}
	}

	this.selection = null; //deselect
	//check if click was close to another control point
	for (var i = 0; i < this.segments.length; i++) {
		if (i == 0) {
			// debugger;
			var p0 = this.segments[i].getP(0);
			if (inRange(p0.elements[0], x, 5) && inRange(p0.elements[1], y, 5)) {
				var s = new Pentool.Selection(null, p0, this.segments[i].getP(1), null, 0)
				this.selection = s;
				//debugger;
				this.updateObservers(this);
				return true;
			}
		}

		var p3 = this.segments[i].getP(3);
		var q1;
		var rIndex;
		if (i == this.segments.length - 1) {
			q1 = null;
			rIndex = null;
		} else {
			q1 = this.segments[i+1].getP(1);
			rIndex = i + 1;
		}


		if (inRange(p3.elements[0], x, 5) && inRange(p3.elements[1], y, 5)) {
			var s = new Pentool.Selection(this.segments[i].getP(2), p3, q1 , i, rIndex);
			this.selection = s;
			//debugger;
			this.updateObservers(this);
			return true;
		}
	}

	//nothing was selected because nothing in range of click:
	this.updateObservers(this);
	return false;
}

Pentool.Model.prototype.updateSelection = function() {
	if (isNumeric(this.selection.leftIndex) && this.selection.leftIndex >= 0) {
		this.selection.p2 = this.segments[this.selection.leftIndex].getP(2);
		this.selection.p3 = this.segments[this.selection.leftIndex].getP(3);
	}

	if (isNumeric(this.selection.rightIndex) && this.selection.rightIndex >= 0) {
		this.selection.q1 = this.segments[this.selection.rightIndex].getP(1);
	}

	this.updateObservers(this);
}

Pentool.Model.prototype.moveSelection = function(x, y) {
	if (this.selection) {
		// console.log("moving selection: " + this.selection.)
		//console.log(this.selection.selectedNode)
		var rIndex = this.selection.rightIndex;
		var lIndex = this.selection.leftIndex;
		//debugger;
		// debugger;
		if (this.selection.selectedNode == 2) {
			this.segments[lIndex].setP(2, Vector.create([x, y]));
			// this.updateSelection();
			// this.updateObservers(this);
		}

		if (this.selection.selectedNode == 3) {
			var pointIndex = 3
			if (lIndex == null || lIndex == undefined) {
				lIndex = rIndex
				pointIndex = 0
			}

			console.log("MoveSelection lIndex: " + lIndex + ", rIndex: " + rIndex + " pointIndex: " + pointIndex);
			this.segments[lIndex].setP(pointIndex, Vector.create([x, y]));
			if (rIndex !== null && rIndex !== undefined) {
				this.segments[rIndex].setP(0, Vector.create([x, y]));
			}
			// this.updateSelection();
			// this.updateObservers(this);
		}

		if (this.selection.selectedNode == 1) {
			this.segments[rIndex].setP(1, Vector.create([x, y]));
			// this.updateSelection();
			// this.updateObservers(this);
		}

		this.updateSelection();
		this.updateObservers(this);

	}
}

Pentool.Model.prototype._createSegment = function(q0, q3) {
	if (this.segments.length == 0) {
		//arbitrarily assign middle two control points
		var directionVector = q3.subtract(q0);
		directionVector = directionVector;
		var q1 = q0.add(directionVector.multiply(0.25));
		var q2 = q0.add(directionVector.multiply(0.75));
		var newSegment = new Pentool.BezierSegment(q0, q1, q2, q3);
		// debugger;
		return newSegment;
	}

	//otherwise set p1 and p2 based on continuity rules
	var previousSegment = this.segments[this.numSegments-1];
	var p0 = previousSegment.getP(0);
	var p1 = previousSegment.getP(1);
	var p2 = previousSegment.getP(2);
	var p3 = previousSegment.getP(3);

	q1 = q0.add(p3.subtract(p2));
	var q2 = q1.multiply(2);
	q2 = q2.add(q0.multiply(-1));
	q2 = q2.add(p3);
	q2 = q2.add(p2.multiply(-2));
	q2 = q2.add(p1);
	var newSegment = new Pentool.BezierSegment(q0, q1, q2, q3);
	// debugger;
	return newSegment;
	// var segment = new Model.BezierSegment
}

// returns true if successful. false otherwise
Pentool.Model.prototype.addPoint = function(p) {
	if (!p) return false;

	if (this.previousPoint == null) {
		this.previousPoint = p;
		return true;
	}

	if (this.previousPoint.eql(p)) return false;

	//stuff to fix:
	// if x coordinate of new point is less, swap previous point and new point (????)

	var seg = this._createSegment(this.previousPoint, p);
	// debugger;
	this._addSegment(seg);
	this.previousPoint = p;
	this.updateObservers();
	return true;
}

Pentool.Model.prototype.getControlPoints = function() {
	var controlPoints = [];

	if (this.segments.length > 0) {
		controlPoints[0] = this.segments[0].getP(0);
	}

	for (var i = 0; i < this.segments.length; i++) {
		controlPoints[i+1] = this.segments[i].getP(3);
	}

	return controlPoints;
}

Pentool.Model.prototype.getSelectedPoint = function() {
	return this.selection;
}

Pentool.Model.prototype.getCurvePixels = function() {
	var pixels = [];
	for (var i = 0; i < this.segments.length; i++) {
		var p0 = this.segments[i].getP(0);
		var p1 = this.segments[i].getP(1);
		var p2 = this.segments[i].getP(2);
		var p3 = this.segments[i].getP(3);

		var delta = p3.subtract(p0);
		var deltax = delta.elements[0];
		for (var j = 0; j <= deltax; j++) {
			var t = j / deltax;
			var coeff0 = Math.pow((1 - t), 3);
			var coeff1 = 3 * Math.pow(1 - t, 2) * t;
			var coeff2 = 3 * (1 - t) * Math.pow(t, 2);
			var coeff3 = Math.pow(t, 3);
			var p = p0.multiply(coeff0);
			p = p.add(p1.multiply(coeff1));
			p = p.add(p2.multiply(coeff2));
			p = p.add(p3.multiply(coeff3));
			p = p.round();
			pixels.push(p);
		}
	}

	return pixels;
}

Pentool.View = function(model) {
	this.model = model;
	this.canvasNode = document.createElement('canvas');
	this.ctx = this.canvasNode.getContext('2d');
	this.canvasWidth = 500;
	this.canvasHeight = 500;
	this.canvasNode.width = this.canvasWidth;
	this.canvasNode.height = this.canvasHeight;
	this.dragging = false;
	this.pixels;
	this.controlPoints;
	this.selectedPoint;
	//add event listeners here
	var self = this;

	$(this.canvasNode).mousedown(function(e) {
		var x = e.pageX - this.offsetLeft;
		var y = e.pageY - this.offsetTop;

		// this.model.addPoint(Vector.create([x, y]));

		//there should be an edit mode and a new mode
		//for now pretend in edit mode:
		// debugger;
		var result = self.model.makeSelection(x, y);
		//console.log(result);
		self.dragging = true;
	})

	$(this.canvasNode).mouseup(function(e) {
		self.dragging = false;
	})

	$(this.canvasNode).mousemove(function(e) {
		var x = e.pageX - this.offsetLeft;
		var y = e.pageY - this.offsetTop;
		// console.log(x, y);

		if (self.dragging) {
			//debugger;
			self.model.moveSelection(x, y);
		}
	})
}

Pentool.View.prototype.render = function() {
	this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
	var pixels = this.pixels;
	var controlPoints = this.controlPoints;
	var selectedPoint = this.selectedPoint;

	if (pixels.length <= 0) {
		return;
	}

	var lastPoint = pixels[0];
	this.ctx.beginPath();
	for (var i = 1; i < pixels.length; i++) {
		this.ctx.fillStyle = 'rgb(0, 0, 0)';
		this.ctx.moveTo(lastPoint.elements[0], lastPoint.elements[1]);
		this.ctx.lineTo(pixels[i].elements[0], pixels[i].elements[1]);
		this.ctx.stroke();
		// this.ctx.fillRect(pixels[i].elements[0], pixels[i].elements[1], 1, 1);
		lastPoint = pixels[i];
	}
	this.ctx.closePath();

	//render control points

	for (var i = 0; i < controlPoints.length; i++) {
		this.fillStyle = 'rgb(0,0,0)';
		this.ctx.fillRect(controlPoints[i].elements[0] - 2.5, controlPoints[i].elements[1] - 2.5, 5, 5);
	}

	if (this.selectedPoint) {
		var p2 = this.selectedPoint.p2;
		var p3 = this.selectedPoint.p3;
		var q1 = this.selectedPoint.q1;

		if (p2) {
			this.ctx.fillStyle = 'rgb(100, 100, 100)';
			if (this.selectedPoint.selectedNode == 2) {
				this.ctx.fillStyle = 'rgb(100, 200, 100)';
			}
			this.ctx.fillRect(p2.elements[0] - 2.5, p2.elements[1] - 2.5, 5, 5);
			this.ctx.moveTo(p2.elements[0], p2.elements[1]);
			this.ctx.lineTo(p3.elements[0], p3.elements[1]);
			this.ctx.stroke();
		}

		if (p3) {
			this.ctx.fillStyle = 'rgb(100, 100, 100)';
			if (this.selectedPoint.selectedNode == 3) {
				this.ctx.fillStyle = 'rgb(100, 200, 100)';
			}
			this.ctx.fillRect(p3.elements[0] - 2.5, p3.elements[1] - 2.5, 5, 5);
		}

		if (q1) {
			// debugger;
			this.ctx.fillStyle = 'rgb(100, 100, 100)';
			if (this.selectedPoint.selectedNode == 1) {
				this.ctx.fillStyle = 'rgb(100, 200, 100)';
			}
			this.ctx.fillRect(q1.elements[0] - 2.5, q1.elements[1] - 2.5, 5, 5);
			this.ctx.moveTo(q1.elements[0], q1.elements[1]);
			this.ctx.lineTo(p3.elements[0], p3.elements[1]);
			this.ctx.stroke();
		}
	}
}

Pentool.View.prototype.update = function(model) {
	this.pixels = model.getCurvePixels();
	this.controlPoints = model.getControlPoints();
	this.selectedPoint = model.getSelectedPoint();
	// console.log("canvas update called");
	// this._renderCanvas(pixels, controlPoints);
}

requestAnimationFrame = window.requestAnimationFrame || 
                                    window.mozRequestAnimationFrame ||
                                    window.webkitRequestAnimationFrame ||
                                    window.msRequestAnimationFrame;

Pentool.Renderer = function() {
	this.views = [];
}

Pentool.Renderer.prototype.addView = function(view) {
	this.views.push(view);
}

Pentool.Renderer.prototype.render = function() {
	for (var i = 0; i < this.views.length; i++) {
		this.views[i].render();
	}
	// debugger;
	requestAnimationFrame(this.render.bind(this));
}

Pentool.main = function() {
	var p1 = Vector.create([10, 10]);
	var p2 = Vector.create([50,150]);
	var p3 = Vector.create([150, 110]);
	var p4 = Vector.create([200, 210]);

	var model = new Pentool.Model();
	var renderer = new Pentool.Renderer();
	var view = new Pentool.View(model);
	var canvas  = view.canvasNode;
	document.body.appendChild(canvas);
	model.addObserver(view);
	renderer.addView(view);

	model.addPoint(p1);
	model.addPoint(p2);
	model.addPoint(p3);
	model.addPoint(p4);
	var pixels = model.getCurvePixels();

	renderer.render();
}

Pentool.main();