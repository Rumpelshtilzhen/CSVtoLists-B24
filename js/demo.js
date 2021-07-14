var inputType = "local";
var stepped = 0, rowCount = 0, errorCount = 0, firstError;
var start, end;
var firstRun = true;
var maxUnparseLength = 10000;

var listID = 0;
var listType = "lists";
var listFields = '';
var localListType = '';
var listFieldsID = [];

var arFields = false;
var arRes = false;

function hideall()	{
	$('.fileselect').hide();
	$('.fieldsselect').hide();
	$('.buttonupload').hide();
	$(".ifGroup").hide();
	$('#files').val(""); 
}
function showall()	{
	$('.fileselect').show();
	$('.fieldsselect').show();
	$('.buttonupload').show();
}

$(function()	{
	BX24.init(function()	{

		ScrollSize();

		$('#listType').change(function()	{
			listType = $(this).val();
			$("#listID").html("");
			hideall();
			
			if(listType == "lists_socnet")	{
				BX24.callMethod(
					'sonet_group.get',
					{
						'ORDER': {'NAME': 'ASC'}
					},
					function(result)	{
						if(result.error())	alert("Error: " + result.error());
						else	{
							var arGroups = result.data();
							var listGroups = '<option value="0"></option>';

							for(var key in arGroups) {
								if (!arGroups.hasOwnProperty(key)) continue;
								listGroups = listGroups+'<option value="'+arGroups[key].ID+'">'+arGroups[key].NAME+'</option>';
							}
							
							$(".groupList").html(listGroups);
							$(".ifGroup").show();
						}
					}
				);	
			}else{
				getListsList();
			}
		});
		
		$('.groupList').change(function()	{
			getListsList();
		});
		
		$('#listID').change(function()	{
			hideall();
			
			var listValue = $(this).val();
			var arListValue = listValue.split(',');
			
			listID = arListValue[0];
			localListType = arListValue[1];
			
			if(listID > 0)	{
				var params_field_get = {
					'IBLOCK_TYPE_ID': localListType,
					'IBLOCK_ID': listID
				};
				BX24.callMethod(
					'lists.field.get',
					params_field_get,
					function(result)	{
						if	(result.error())	{
							alert("Error: " + result.error());
						}else	{
							var arListFields = result.data();
							
							listFields = '<select class="fieldFromList" rel="FORAUTOCHENGE"><option value=""></option>';
							//console.dir(arListFields);
							
							for(var key in arListFields) {
								if (!arListFields.hasOwnProperty(key)) continue;
								listFields = listFields+"<option value='"+arListFields[key].FIELD_ID+"' rel='"+arListFields[key].TYPE+"' mult='"+arListFields[key].MULTIPLE+"' vals='"+JSON.stringify(arListFields[key].DISPLAY_VALUES_FORM)+"'>"+arListFields[key].NAME+"</option>";
								listFieldsID = listFieldsID + arListFields[key].FIELD_ID;
							}
							listFields = listFields+"</select>";

							$('.fileselect').show();
							if(listType == "lists_socnet")	$(".ifGroup").show();
						}
					}
				);
			}
		});
	
		$('#files').change(function()	{
			if ($(this).attr('disabled') == "true")	return;

			stepped = 0;
			rowCount = 0;
			errorCount = 0;
			firstError = undefined;

			var config = buildConfig();
			//console.log(config);
			
			// Allow only one parse at a time
			if (inputType == "local")	{
				if (!$('#files')[0].files.length)	{
					alert("Пожалуйста, выберите файл для загрузки.");
					return enableButton();
				}
				
				$('#files').parse({
					config: config,
					before: function(file, inputElem)	{
						$('#files').attr('disabled', true);
						start = now();
						//console.log("Parsing file...", file);
					},
					error: function(err, file)	{
						console.log("ERROR:", err, file);
						firstError = firstError || err;
						errorCount++;
					},
					complete: function()	{
						end = now();
						$('#files').removeAttr('disabled');
					}
				});
			}
			showall();
		});
		
		$('#submit').click(function()	{sendData(arRes, 0, 0)}	);
		$('#insert-tab').click(function()	{$('#delimiter').val('\t')}	);
		getListsList();
	});
});

function getListsList()	{
	var listList = "";
	var params_lists = {
		'IBLOCK_TYPE_ID': listType
	};

	if(listType == "lists_socnet")	{
		var socnetID = $(".groupList").val();
		
		if(socnetID > 0)	params_lists['SOCNET_GROUP_ID']	= socnetID;
		else	alert("Укажите группу");
	}

	listList = '<option value="0"></option>';
	BX24.callMethod(
		'lists.get',
		params_lists,
		function(result)	{
			if(result.error())	{
				alert("Нет доступных списков с указанными параметрами");
			}else{
				var arPartResult = result.data();
				var count = 0;
				for(var key in arPartResult) {
					if (!arPartResult.hasOwnProperty(key)) continue;
					count++;
					listList = listList+'<option value="'+arPartResult[key].ID+','+arPartResult[key].IBLOCK_TYPE_ID+'">'+arPartResult[key].NAME+'</option>';
				}
				if(result.more())	result.next();
				
				if(count > 0)	$("#listID").html(listList);
				else	alert("Нет доступных списков с указанными параметрами");
			}
		}
	);
}

function ScrollSize()	{
	var obSize = BX24.getScrollSize();
	BX24.resizeWindow(obSize.scrollWidth, obSize.scrollHeight+200);
}

function buildConfig()	{
	return {
		delimiter: "",
		header: true,
		dynamicTyping: false,
		skipEmptyLines: true,
		preview: 0,
		step: undefined,
		encoding: "UTF-8",
		worker: false,
		comments: "",
		complete: completeFn,
		error: errorFn,
		download: false
	};
}

function stepFn(results, parser)	{
	stepped++;
	if (results)	{
		if (results.data)	rowCount += results.data.length;
		if (results.errors)	{
			errorCount += results.errors.length;
			firstError = firstError || results.errors[0];
		}
	}
}

function buildTable(arFields)	{
	//console.log(arFields);
	$(".tableRows").html('<table id="maneTable" cellpadding="10"><tr><th>Уникальное</th><th>Поле в CSV</th><th>Поле в списке</th></tr></table>');
	k = 0;
	for(var key in arFields) {
		if (!arFields.hasOwnProperty(key)) continue;
		k++;
		selectedCh = (k == 1)	? "checked"	: "";
		
		var listFieldsMod = listFields.replace('FORAUTOCHENGE',arFields[key].replace(/[^a-zа-яё0-9]/gi,''));
		$('#maneTable').append('<tr><td><input type="radio" name="unicField" class="unicField" value="'+arFields[key]+'" '+selectedCh+' /></td><td>'+arFields[key]+'</td><td>'+listFieldsMod+'</td></tr>');

		$('select[rel="'+arFields[key].replace(/[^a-zа-яё0-9]/gi,'')+'"] option:contains("'+arFields[key]+'")').prop('selected', true).each(function() {
			if($(this).attr("rel") == "L")	{
				var arFieldListList = JSON.parse($(this).attr("vals"));
				var fieldSoTable = '<table class="ff'+arFields[key]+'" cellpadding="10"><tr><th>Значение списка</th><th>Значение в csv</th></tr>';
				for(var key in arFieldListList) {
					if (!arFieldListList.hasOwnProperty(key)) continue;
					fieldSoTable = fieldSoTable+'<tr><td>'+arFieldListList[key]+'</td><td><input type="text" value="'+arFieldListList[key]+'" rel="'+$(this).attr("value")+'" name="var'+key+'" placeholder="'+arFieldListList[key]+'" /></td></tr>';
				}
				fieldSoTable = fieldSoTable+'</table>';
				
				$(this).parent().parent().append(fieldSoTable);
			}
		});
	}
	ScrollSize();
}

function completeFn(results)	{
	end = now();

	if (results && results.errors)	{
		if (results.errors)	{
			errorCount = results.errors.length;
			firstError = results.errors[0];
		}
		if (results.data && results.data.length > 0)	rowCount = results.data.length;
	}

	arFields = results.meta.fields;
	arRes = results.data;
	
	buildTable(arFields);

	$(".fieldFromList").change(function()	{
		var tableClassMerk = $(this).attr("rel").replace(/[^a-zа-яё0-9]/gi,'');
		var delTable = $(this).parent().children("table");
		//console.log(delTable);
		$(delTable).remove();
		
	  $(".fieldFromList[rel='"+tableClassMerk+"'] option:selected" ).each(function() {
			var field_type = $(this).attr("rel");
			var valuePrCode = $(this).attr("value");

			if(field_type == "L")	{
				var arFieldListList = JSON.parse($(this).attr("vals"));
				var fieldSoTable = '<table class="ff'+tableClassMerk+'" cellpadding="10"><tr><th>Значение списка</th><th>Значение в csv</th></tr>';
				for(var key in arFieldListList) {
					if (!arFieldListList.hasOwnProperty(key)) continue;
					fieldSoTable = fieldSoTable+'<tr><td>'+arFieldListList[key]+'</td><td><input type="text" value="'+arFieldListList[key]+'" rel="'+valuePrCode+'" name="var'+key+'" placeholder="'+arFieldListList[key]+'" /></td></tr>';
				}
				fieldSoTable = fieldSoTable+'</table>';
				
				$(this).parent().parent().append(fieldSoTable);				
				ScrollSize();
			}
			if(field_type == "E")	{
				var arFieldListList = JSON.parse($(this).attr("vals"));
				var fieldSoTable = '<table class="ff'+tableClassMerk+'" cellpadding="10" style="display: none"><tr><th>Значение списка</th><th>Значение в csv</th></tr>';
				for(var key in arFieldListList) {
					if (!arFieldListList.hasOwnProperty(key)) continue;
					fieldSoTable = fieldSoTable+'<tr><td>'+arFieldListList[key]+'</td><td><input type="text" value="'+arFieldListList[key]+'" rel="'+valuePrCode+'" name="var'+key+'" placeholder="'+arFieldListList[key]+'" /></td></tr>';
				}
				fieldSoTable = fieldSoTable+'</table>';
				
				$(this).parent().parent().append(fieldSoTable);
			}
		});
	});
	//console.log(arRes);
	
	ScrollSize();
	
	// icky hack
	//setTimeout(enableButton, 100);
}

function sendData(arRes, key, counter_upl)	{
	
	var IBLOCK_TYPE_ID = listType;
	var IBLOCK_ID = listID;
	
	if (arRes.hasOwnProperty(key))	{
		var fieldsMass = {};
		var fieldsAssoc = {};
		
		for(var key2 in arRes[key]) {
			if (!arRes[key].hasOwnProperty(key2)) continue;
			var fieldCode = $(".fieldFromList[rel='"+key2+"']").val();
			console.log("fieldCode_1: "+fieldCode);
		
			
			var mult = "", ftype = "";
			$(".fieldFromList[rel='"+key2+"'] option:selected" ).each(function() {
				mult = $(this).attr("mult");
				ftype = $(this).attr("rel");
			});

			console.log(mult);
			console.log(ftype);
			
			switch(ftype) {
				case("L" || "E:EList"):
					var arAssocFVals_L = {};
					var arVals = arRes[key][key2].split(',');
					
					for(var key3 in arVals) {
						if (!arVals.hasOwnProperty(key3)) continue;
						
						$("input[rel='"+fieldCode+"']").each(function()	{
							arAssocFVals_L[$(this).val()] = $(this).attr("name").replace("var","");
						});
					}
					console.log(arAssocFVals_L);
					
					if(mult == "Y")	{
						if(fieldCode != "")	{
							var arThisAr = {};

							for(var key3 in arVals) {
								if (!arVals.hasOwnProperty(key3)) continue;
								arThisAr['n'+key3] = !arAssocFVals_L[arVals[key3]]
								? arVals[key3]
								: arAssocFVals_L[arVals[key3]];
							}
							fieldsMass[fieldCode] = arThisAr;
						}
					}else{
						if(fieldCode != "")	{
							fieldsMass[fieldCode] = !arAssocFVals_L[arRes[key][key2]]
							? arRes[key][key2]
							: {'n0': arAssocFVals_L[arRes[key][key2]]};
						}
					}
					break;
				case("S:ECrm"):
					var arAssocFVals_Crm = {};
					var arVals = arRes[key][key2].split(',');
					var valCell;
					
					for(var key3 in arVals) {
						if (!arVals.hasOwnProperty(key3)) continue;
						
						$("input[rel='"+fieldCode+"']").each(function()	{
							arAssocFVals_Crm[$(this).val()] = $(this).attr("name").replace("var","");
						});
					}
					console.log(arAssocFVals_Crm);
					
					if(mult == "Y")	{
						if(fieldCode != "")	{
							var arThisAr = {};

							for(var key3 in arVals) {
								if (!arVals.hasOwnProperty(key3)) continue;
								valCell = !arAssocFVals_Crm[arVals[key3]]
								? arVals[key3]
								: arAssocFVals_Crm[arVals[key3]];

								console.log(ftype+"_M: "+valCell);
								if(isNaN(valCell)) {
									var procTypeAPI_M = 'crm.contact.list';
									var params_M = {
										order: { "DATE_CREATE": "ASC" },
										filter: { "LAST_NAME": valCell },
										select: [ "ID", "NAME", "LAST_NAME", "TYPE_ID" ]
									}

									BX24.callMethod(
										procTypeAPI_M,
										params_M,
										function(result)	{
											if(result.error())	{
												console.log("Error: "+result.error());
												alert("Ошибка: "+result.error());
											}else{
												arThisAr['n'+key3] = result.data()[0].ID;
											}
										}
									);
								}else arThisAr['n'+key3] = valCell;
								console.log(ftype+"_mult: "+arThisAr['n'+key3]);
							}
							fieldsMass[fieldCode] = arThisAr;
						}
					}else{
						if(fieldCode != "")	{
							valCell = !arAssocFVals_Crm[arRes[key][key2]]
							? arRes[key][key2]
							: {'n0': arAssocFVals_Crm[arRes[key][key2]]};
							
							console.log(ftype+"_N: "+valCell);
							if(isNaN(valCell)) {
									var procTypeAPI_N = 'crm.contact.list';
									var params_N = {
										order: { "DATE_CREATE": "ASC" },
										filter: { "LAST_NAME": valCell },
										select: [ "ID", "NAME", "LAST_NAME", "TYPE_ID" ]
									}
									
									BX24.callMethod(
										procTypeAPI_N,
										params_N,
										function(result)	{
											if(result.error())	{
												console.log("Error: "+result.error());
												alert("Ошибка: "+result.error());
											}else{
												fieldsMass[fieldCode] = result.data()[0].ID;
											}
										}
									);
							}else	fieldsMass[fieldCode] = valCell;
						}
					}
					break;
				case("S:employee"):
					var arAssocFVals_Emp = {};
					var arVals_Emp = arRes[key][key2].split(',');
					var valCell_Emp;
					
					for(var key3 in arVals_Emp) {
						if (!arVals_Emp.hasOwnProperty(key3)) continue;
						
						$("input[rel='"+fieldCode+"']").each(function()	{
							arAssocFVals_Emp[$(this).val()] = $(this).attr("name").replace("var","");
						});
					}
					console.log(arAssocFVals_Emp);
					
					if(mult == "Y")	{
						if(fieldCode != "")	{
							var arThisAr = {};

							for(var key3 in arVals_Emp) {
								if (!arVals_Emp.hasOwnProperty(key3)) continue;
								valCell_Emp = !arAssocFVals_Emp[arVals_Emp[key3]]
								? arVals_Emp[key3]
								: arAssocFVals_Emp[arVals_Emp[key3]];

								console.log(ftype+"_M: "+valCell_Emp);
								if(isNaN(valCell_Emp)) {
									var procTypeAPI_M = 'user.get';
									var params_M = {	"LAST_NAME": valCell_Emp	};

									BX24.callMethod(
										procTypeAPI_M,
										params_M,
										function(result)	{
											if(result.error())	{
												console.log("Error: "+result.error());
												alert("Ошибка: "+result.error());
											}else{
												arThisAr['n'+key3] = result.data()[0].ID;
											}
										}
									);
								}else arThisAr['n'+key3] = valCell_Emp;
								console.log(ftype+"_mult: "+arThisAr['n'+key3]);
							}
							fieldsMass[fieldCode] = arThisAr;
						}
					}else	{
						if(fieldCode != "")	{
							valCell_Emp = !arAssocFVals_Emp[arRes[key][key2]]
							? arRes[key][key2]
							: {'n0': arAssocFVals_Emp[arRes[key][key2]]};
							
							console.log(ftype+"_N: "+valCell_Emp);
							if(isNaN(valCell_Emp)) {
								var procTypeAPI_N = 'user.get';
								var params_N = {	"LAST_NAME": valCell_Emp	};
								
								BX24.callMethod(
									procTypeAPI_N,
									params_N,
									function(result)	{
										if(result.error())	{
											console.log("Error: "+result.error());
											alert("Ошибка: "+result.error());
										}else{
											fieldsMass[fieldCode] = result.data()[0].ID;
										}
									}
								);
							}else	fieldsMass[fieldCode] = valCell_Emp;
						}
					}
					break;
				case("E"):
					var arAssocFVals_E = {};
					var arVals = arRes[key][key2].split(',');
					
					for(var key3 in arVals) {
						if (!arVals.hasOwnProperty(key3)) continue;
						
						$("input[rel='"+fieldCode+"']").each(function()	{
							arAssocFVals_E[$(this).val()] = $(this).attr("name").replace("var","");
						});
					}
					console.log(arAssocFVals_E);
					
					if(mult == "Y")	{
						if(fieldCode != "")	{
							var arThisAr = {};

							for(var key3 in arVals) {
								if (!arVals.hasOwnProperty(key3)) continue;
								arThisAr['n'+key3] = !arAssocFVals_E[arVals[key3]]
								? arVals[key3]
								: arAssocFVals_E[arVals[key3]];
							}
							fieldsMass[fieldCode] = arThisAr;
						}
					}else{
						if(fieldCode != "")	{
							fieldsMass[fieldCode] = !arAssocFVals_E[arRes[key][key2]]
							? arRes[key][key2]
							: {'n0': arAssocFVals_E[arRes[key][key2]]};
						}
					}
					break;
				default:
					if(fieldCode != "") fieldsMass[fieldCode] = arRes[key][key2];
			}
			console.log("fieldCode_"+ftype+": "+fieldCode);
      if(fieldCode != "")	fieldsAssoc[key2] = fieldCode;
			console.log("fieldsMass["+fieldCode+"]: "+fieldsMass[fieldCode]);
		}
		
		console.log('fieldsMass: '+fieldsMass);
		var keyField = $(".unicField:radio:checked").attr("value");
		
		//console.log(arRes[key][keyField]);
		if(arRes[key][keyField] != "")	{
			
			var filterLine = {};
			filterLine[fieldsAssoc[keyField]] = arRes[key][keyField];
			
      var procTypeAPI = 'lists.element.get';
			var params_el = {
				'IBLOCK_TYPE_ID': IBLOCK_TYPE_ID,
				'IBLOCK_ID': IBLOCK_ID,
				'FILTER': filterLine
			};
			//console.log(params3);
			BX24.callMethod(
				procTypeAPI,
				params_el,
				function(result)	{
					if(result.error())	{
						console.log("Error: " + result.error());
						alert("Ошибка: "+result.error());
					}else{
						arData = result.data();
            delete params_el['FILTER'];
            params_el['FIELDS'] = fieldsMass;

						if(arData[0] !== undefined)	{
							procTypeAPI = 'lists.element.update';
							params_el['ELEMENT_ID'] = arData[0]["ID"];
						}else{
							procTypeAPI = 'lists.element.add';
							params_el['ELEMENT_CODE'] = arRes[key][keyField];
						}

						BX24.callMethod(
							procTypeAPI,
							params_el,
							function(result)	{
								if(result.error())	{
									console.log("Error: "+result.error());
									alert("Ошибка: "+result.error());
								}else{
									counter_upl++;
									$("#counter-upl").html("Обновлено записей: "+counter_upl);
									
									key++;
									setTimeout(sendData, 100, arRes, key, counter_upl);
								}
							}
						);
					}
				}
			);
		}else{
				counter_upl++;
				$("#counter-upl").html("Обновлено записей: "+counter_upl);
				
				key++;
			setTimeout(sendData, 100, arRes, key, counter_upl);
		}
	}
}

function errorFn(err, file)	{
	end = now();
	console.log("ERROR:", err, file);
	enableButton();
}

function enableButton()	{
	$('#submit').attr('disabled', false);
}

function now()	{
	return typeof window.performance !== 'undefined'
			? window.performance.now()
			: 0;
}
