(function () {
    widget = Retina.Widget.extend({
        about: {
                title: "Metagenome API Widget",
                name: "metagenome_api",
                author: "Tobias Paczian",
                requires: [ ]
        }
    });
    
    widget.setup = function () {
	return [ ];
    };
    
    widget.display = function (params) {
        widget = this;
	var index = widget.index;
	
	if (params && params.main) {
	    widget.main = params.main;
	    widget.sidebar = params.sidebar;
	}
	var content = widget.main;
	var sidebar = widget.sidebar;
	
	sidebar.parentNode.style.display = "none";
	content.className = "span10 offset1";
	
	document.getElementById("pageTitle").innerHTML = "API explorer";
		
	var html = ["<div style='width: 400px; margin-left: auto; margin-right: auto; margin-top: 100px;'><img src='Retina/images/waiting.gif' style='width: 32px;'> loading content...</div>"];
	
	content.innerHTML = html.join('');

	jQuery.ajax({
	    dataType: "json",
	    headers: stm.authHeader, 
	    url: RetinaConfig.mgrast_api,
	    success: function (data) {
		stm.DataStore.api = data;
		Retina.WidgetInstances.metagenome_api[1].showContent();
	    }}).fail(function(xhr, error) {
		content.innerHTML = "<div class='alert alert-danger' style='width: 500px;'>could not reach API server</div>";
		console.log(error);
	    });
	return;
    };

    widget.showContent = function () {
	var widget = this;

	var data = stm.DataStore.api;

	var html = [ '<h3>MG-RAST API explorer</h3>' ];

	var shortDesc = data.description.substring(0, data.description.indexOf('</p>') + 4);
	var fullDesc = data.description.substring(data.description.indexOf('</p>') + 4);

	html.push(shortDesc);
	html.push('<div style="text-align: center;"><button class="btn btn-mini" style="width: 50px; margin-bottom: 30px;" onclick="jQuery(\'#fullDesc\').toggle();">...</button></div>');
	html.push('<div id="fullDesc" style="display: none;">'+fullDesc+'</div>');

	html.push('<h3>access to private data</h3>');
	if (stm.user) {
	    html.push('<p>You are logged in and your webkey is auto-filled into the forms below. This is needed to access your private data. To access your current webkey, go to the <b>myData page</b>, click the <b>user icon</b> and then the <b>show webkey</b> button. <sup onmouseover="jQuery(\'#webkey\').toggle();" onmouseout="jQuery(\'#webkey\').toggle();">[?]</sup></p><img src="images/webkey.png" style="display: none;" id="webkey">');
	} else {
	    html.push('<p>You are not logged in and do not have access to private data. Use the <b>login</b> button at the top right of the page to log in.</p><p>If you do not yet have an account, obtain one by clicking the <b>register</b> button next to the login button.</p>');
	}
	
	for (var i=0; i<data.resources.length; i++) {
	    var r = data.resources[i];
	    html.push('<h3>'+r.name+'</h3><div id="resource'+r.name+'"><img src="Retina/images/waiting.gif" style="width: 16px;"> loading...</div>');
	}
	widget.main.innerHTML = html.join("");
	
	for (var i=0; i<data.resources.length; i++) {
	    var r = data.resources[i];
	    jQuery.ajax({
		dataType: "json",
		url: r.url,
		res: r.name,
		rid: i,
		success: function (d) {
		    var widget = Retina.WidgetInstances.metagenome_api[1];
		    stm.DataStore.api.resources[this.rid] = d;
		    var h = [];
		    h.push('<p>'+d.description+'</p>');
		    h.push('<h4>requests</h4>');
		    for (var j=0; j<d.requests.length; j++) {
			var req = d.requests[j];
			
			if (req.hasOwnProperty('example')) {
			    var example_description = req.example[1];
			    var example_params = req.example[0].substr(req.example[0].lastIndexOf('/')+1).split('?');
			    var example_id = null;
			    var phash = {};
			    if (example_params.length > 1) {
				if (example_params[0] != req.name) {
				    example_id = example_params[0];
				    example_params[0] = example_params[1];
				    var idfield = req.request.substring(req.request.indexOf('{')+1, req.request.indexOf('}')).toLowerCase();
				    phash[idfield] = example_id;
				} else {
				    example_params[0] = example_params[1];
				}
			    }
			    example_params = example_params[0].split('&');
			    for (var k=0; k<example_params.length; k++) {
				if (example_params[k].indexOf('=') > -1) {
				    var x = example_params[k].split('=');
				    phash[x[0]] = x[1];
				}
			    }
			    example_params = phash;
			    req.example = { "description": example_description,
					    "params": example_params,
					    "id": example_id };
			}
			
			req.call = req.request.substring(RetinaConfig.mgrast_api.length).replace('//', '/');
			h.push('<div class="request" style="cursor: pointer;"><div class="requestMethod"><span>'+req.method+'</span><span>'+req.call+'</span></div><div onclick="jQuery(\'#request'+this.res+req.name+req.method+'\').toggle();">'+req.description+'</div><div class="requestchild" id="request'+this.res+req.name+req.method+'" style="display: none;">');

			if (req.example) {
			    h.push('<h5>example</i></h5><p style="padding-left: 100px;">'+req.example.description+'</p>');
			}

			h.push('<form class="form-horizontal" onsubmit="return false" resource="'+this.rid+'" request="'+j+'" target="request'+this.res+req.name+req.method+'target">')
			
			h.push('<h5>required parameters</h5>');

			var params = Retina.keys(req.parameters.required).sort();
			for (var k=0; k<params.length; k++) {
			    h.push(widget.formField(params[k], req.parameters.required[params[k]], req));
			}
			if (params.length == 0) {
			    h.push('<div style="padding-left: 100px;"> - no required parameters - </div>');
			}
			
			h.push('<h5>optional parameters</h5>');

			params = Retina.keys(req.parameters.options).sort();
			for (var k=0; k<params.length; k++) {
			    h.push(widget.formField(params[k], req.parameters.options[params[k]], req));
			}
			bparams = Retina.keys(req.parameters.body).sort();
			for (var k=0; k<bparams.length; k++) {
			    h.push(widget.formField(bparams[k], req.parameters.body[bparams[k]], req));
			}
			if (params.length + bparams.length == 0) {
			    h.push('<div style="padding-left: 100px;"> - no optional parameters - </div>');
			}
			h.push('<button class="btn pull-left" onclick="Retina.WidgetInstances.metagenome_api[1].submitForm(this, true);">show curl</button>');
			h.push('<button class="btn pull-right" onclick="Retina.WidgetInstances.metagenome_api[1].submitForm(this);">send</button>');
			h.push('</form>');

			h.push('<div id="request'+this.res+req.name+req.method+'target"></div>');
			
			h.push('<h5 style="clear: both;">return structure</h5>');
			h.push('<pre>'+JSON.stringify(req.attributes == "self" ? req : req.attributes, null, 2)+'</pre>');
			h.push('</div></div>');
		    }
		    document.getElementById('resource'+d.name).innerHTML = h.join("");
		}}).fail(function(xhr, error) {
		    content.innerHTML = "<div class='alert alert-danger' style='width: 500px;'>could not reach API server</div>";
		    console.log(error);
		});
	}
    };

    widget.formField = function (name, p, req) {
	var h = [];
	h.push('<div class="control-group"><label class="control-label" >'+name+'</label><div class="controls">');
	if (p[0] == 'string') {
	    var val = "";
	    if (name == 'auth' && stm.user) {
		val = stm.user.token;
	    } else if (req.example && req.example.params.hasOwnProperty(name)) {
		val = req.example.params[name];
	    }
	    h.push('<input type="text" name="'+name+'" placeholder="'+name+'" value="'+val+'">');
	} else if (p[0] == 'cv') {
	    h.push('<select name="'+name+'">');
	    var val = req.example && req.example.params.hasOwnProperty(name) ? req.example.params[name] : null;
	    for (var l=0; l<p[1].length; l++) {
		h.push('<option title="'+p[1][l][1]+'"'+(val !== null && val == p[1][l][0] ? ' selected="selected"' : '')+'>'+p[1][l][0]+'</option>');
	    }
	    h.push('</select>');
	} else if (p[0] == 'boolean') {
	    h.push('<select name="'+name+'"><option value=0>no</option><option value=1'+(req.example && req.example.params.hasOwnProperty(name) && req.example.params[name] ? ' selected="selected"' : "")+'>yes</option></select>');
	} else if (p[0] == 'int' || p[0] == 'integer') {
	    var val = req.example && req.example.params.hasOwnProperty(name) ? req.example.params[name] : "";
	    h.push('<input type="text" name="'+name+'" placeholder="'+name+'" value="'+val+'">');
	} else {
	    var val = req.example && req.example.params.hasOwnProperty(name) ? req.example.params[name] : "";
	    h.push('<input type="text" name="'+name+'" placeholder="'+name+'" value="'+val+'">');
	}
	if (p[0] !== 'cv') {
	    h.push('<span class="help-inline">'+p[1]+'</span>');
	}
	h.push('</div></div>');
	
	return h.join("");
    };

    widget.submitForm = function (btn, curlOnly) {
	var widget = this;

	var form = btn.parentNode;
	if (btn.innerHTML == 'send') {
	    btn.setAttribute('disabled', 'disabled');
	    btn.innerHTML = '<img src="Retina/images/waiting.gif" style="width: 12px;">';
	}
	
	var resource = stm.DataStore.api.resources[form.getAttribute('resource')];
	var request = resource.requests[form.getAttribute('request')];
	var target = form.getAttribute('target');

	var values = {};
	for (var i=0; i<form.elements.length; i++) {
	    if (form.elements[i].value) {
		values[form.elements[i].name] = form.elements[i].value;
	    }
	}

	var req = Retina.keys(request.parameters.required);
	for (var i=0; i<req.length; i++) {
	    if (! values.hasOwnProperty(req[i])) {
		alert('required parameter '+req[i]+' is missing');
		return;
	    }
	}

	var url = request.request.replace("//", "/");
	if (url.match(/\{ID\}/)) {
	    url = url.replace("{ID}", values.id);
	} else if (url.match(/\{id\}/)) {
	    url = url.replace("{id}", values.id);
	} else if (url.match(/\{text\}/)) {
	    url = url.replace("{text}", values.text);
	} else if (url.match(/\{SERVICE\}/)) {
	    url = url.replace("{SERVICE}", values.service);
	}

	if (Retina.keys(values).length && request.method == 'GET') {
	    url += "?";
	    var p = [];
	    for (var i in values) {
		if (i == 'id') { continue; }
		p.push(i+"="+values[i]);
	    }
	    url += p.join("&");
	}
	
	if (curlOnly) {
	    document.getElementById(target).innerHTML = "<h5 style='clear: both; margin-top: 30px;'>curl</h5><pre style='margin-bottom: 30px;'>curl "+(stm.user ? "-H 'Authorization: mgrast "+stm.user.token+"' " : "")+"'"+(request.method == "POST" ? "-d '"+JSON.stringify(values).replace(/'/g, "\\'")+"' " : "")+""+url+"'</pre>";
	} else {
	    if (request.attributes.hasOwnProperty("streaming text")) {
		btn.removeAttribute('disabled');
		btn.innerHTML = 'send';
		url += (stm.authHeader && stm.authHeader.Authorization ? "&auth="+stm.authHeader.Authorization : "")+"&browser=1";
		window.w = window.open(url);
		window.setTimeout(function () { window.w.close(); }, 5000);
	    } else {
		jQuery.ajax({
		    method: request.method,
		    url: url,
		    button: btn,
		    data: request.method == "POST" ? values : null,
		    target: target,
		    success: function (d) {
			this.btn.removeAttribute('disabled');
			this.btn.innerHTML = 'send';
			document.getElementById(this.target).innerHTML = "<div style='clear: both; height: 30px;'></div><h5>response</h5><pre style='margin-bottom: 30px;'>"+JSON.stringify(d, null, 2)+"</pre>";
		    }}).fail(function(xhr, error) {
			this.btn.removeAttribute('disabled');
			this.btn.innerHTML = 'send';
			document.getElementById(this.target).innerHTML = "<div style='clear: both; height: 30px;'></div><div class='alert alert-danger'>"+xhr.responseText+"</div>";
			console.log(error);
		    });
	    }
	}
    };
	
})();
