/*
MIT License

Copyright (c) 2018 Jeremy A. Boyd

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
Array.prototype.all = function (predicate) {
	for (var i = 0; i < this.length; i++)
		if (!predicate.call(null, this[i])) return false;
	return true;
}

Array.prototype.any = function (predicate) {
	for (var i = 0; i < this.length; i++)
		if (predicate.call(null, this[i])) return true;
	return false;
}

Array.prototype.where = function (predicate) {
	return this.filter(predicate);
}

Array.prototype.skip = function (count) {
	return this.slice(count);
}

Array.prototype.take = function (count) {
	return this.slice(0, count);
}

Array.prototype.select = function (func) {
	return this.map(func);
}

Array.prototype.selectMany = function (func) {
	return [].concat.apply([], this.map(func));
}

Array.prototype.firstOrDefault = function (predicate) {
	var that = this;
	if (predicate && typeof predicate === "function")
		that = that.where(predicate);

	if (that.length > 0) return that[0];
	return null;
}

Array.prototype.first = function (predicate) {
	var that = this;
	if (predicate && typeof predicate === "function")
		that = that.where(predicate);

	if (that.length > 0) return that[0];
	throw "Sequence contains no elements";
}

Array.prototype.singleOrDefault = function (predicate) {
	var that = this;
	if (predicate && typeof predicate === "function")
		that = that.where(predicate);

	if (that.length === 1) return that[0];
	if (that.length === 0) return null;

	throw "More than one element exists in sequence";
}

Array.prototype.single = function (predicate) {
	var that = this;
	if (predicate && typeof predicate === "function")
		that = that.where(predicate);

	if (that.length === 1) return that[0];
	if (that.length === 0)
		throw "Sequence contains no elements";

	throw "More than one element exists in sequence";
}

Array.prototype.orderBy = function () {
	return this.sort((e1, e2) => {
		for (var i = 0; i < arguments.length; i++) {
			var property = arguments[i];
			if (property.substr(0, 1) === '-') {
				property = property.substr(1);
				if (e1[property] < e2[property]) return 1;
				if (e1[property] > e2[property]) return -1;
			} else {
				if (e1[property] < e2[property]) return -1;
				if (e1[property] > e2[property]) return 1;
			}
		}
	});
}

Array.prototype.orderBy2 = function (o) {
	var keys = Object.keys(o);
	const result = this.sort((e1, e2) => {
		keys.forEach(key => {
			let field = o[key];
			if (typeof field === "number") {
				if (field < 0) {
					if (e1[key] < e2[key]) return 1;
					if (e1[key] > e2[key]) return -1;
				} else {
					if (e1[key] < e2[key]) return -1;
					if (e1[key] > e2[key]) return 1;
				}
			} else if (typeof field === "object") {
				const {
					direction,
					transform
				} = field;
				console.log(field);
				if (direction < 0) {
					if (transform(e1[key]) < transform(e2[key])) return 1;
					if (transform(e1[key]) > transform(e2[key])) return -1;
				} else {
					if (transform(e1[key]) < transform(e2[key])) return -1;
					if (transform(e1[key]) > transform(e2[key])) return 1;
				}
			}
		})
	});
	console.log(result);
	return result;
}