function showHideTableSection(parentid,status){
    $.post({
        url : 'inc/infrastructure/KVM/TableState.php',
        data: {
            parentid: parentid,
            status: status,
        },
    });
}
//==================================================================
function updateVMLock(vmid,lock){
    $.post({
        url : 'inc/infrastructure/KVM/LockVM.php',
        data: {
            vm: vmid,
            lock: lock,
        },
        success: function(data){
            formatAlertMessage(data);
        },
    });
}
//==================================================================
function lockVM(vmid){
    if ($("#copy-disk-from-source-button-"+vmid ).hasClass( 'disabled' )){
        updateVMLock(vmid,'false');
        $("#lock-vm-button-"+vmid).html("VM locked:<i class=\"fa fa-fw fa-square-o\" aria-hidden=\"true\"></i>");
        $("#copy-disk-from-source-button-"+vmid).removeClass('disabled');
        $(".lockable-vm-buttons-"+vmid).removeClass('disabled');
        $("#PopulateMachinesButton-"+vmid).removeClass('disabled');
    }
    else{
        updateVMLock(vmid,'true');
        $("#lock-vm-button-"+vmid).html("VM locked:<i class=\"fa fa-fw fa-check-square-o\" aria-hidden=\"true\"></i>");
        $("#copy-disk-from-source-button-"+vmid).addClass('disabled');
        $(".lockable-vm-buttons-"+vmid).addClass('disabled');
        $("#PopulateMachinesButton-"+vmid).addClass('disabled');
    }
}
//==================================================================
function reloadKVMVmTable(){
    $( "#main_table" ).load( "inc/infrastructure/KVM/DrawTable.php" );
}
//==================================================================
function checkVMStatus(vm, state, is_parent){
    function runQuery(){
        $.post({
            url: 'inc/infrastructure/KVM/GetVMState.php',
                data: {
                    vm: vm,
                    is_parent: is_parent,
                },
                success: function(data) {
                    var required_state = '';
                    if(state == 'mass_on' || state == 'up')
                        required_state = 'running';
                    else
                        required_state = 'shut';
                    reply = jQuery.parseJSON(data);
                    if (is_parent){ // if there are multiple machines (using mass_x button from initial machine)
                        item_count = reply.length;
                        $.each(reply, function(i, obj){
                            if (obj['state'] == required_state){// if machine is in required state, update information in table
                                $("#VMStatusText-" + obj.id).html(obj.state_html);
                                $("#PowerProgressBar-" + obj.id).addClass('hide');
                                --item_count;
                            }
                            else{
                                $("#PowerProgressBar-" + obj.id).removeClass('hide');
                            }
                        });
                        if (item_count > 0){ // if there are still machines in unwanted state, re-run query
                            setTimeout(function() {runQuery()}, 4000);
                        }
                    }
                    else{// if it is a single VM power cycle
                        if (reply.state == required_state){
                            $("#VMStatusText-" + reply.id).html(reply.state_html);
                            $("#PowerProgressBar-" + reply.id).addClass('hide');
                        }
                        else{
                            $("#PowerProgressBar-" + reply.id).removeClass('hide');
                            setTimeout(function() {runQuery()}, 4000);
                        }
                    }
                },
            });
        }
    runQuery();
}
//==================================================================
$(document).ready(function(){
    $('#main_table').on("click", "a.DeleteVMButton", function() { //since table items are dynamically generated, we will not get ordinary .click() event
        var vm = $(this).attr('data-vm');
        var hypervisor = $(this).attr('data-hypervisor');
        var action = $(this).attr('data-action');
        var parent = $(this).attr('data-parent');
        $.confirm({
            title: 'Alert!',
            content: 'Are you sure?',
            animation: 'opacity',
            buttons: {
                yes: {
                    btnClass: 'btn-danger',
                    action: function(){
                        $('#PleaseWaitDialog').modal('show');
                        $.post({
                            url: 'inc/infrastructure/KVM/DeleteVM.php',
                            data: {
                                vm: vm,
                                hypervisor: hypervisor,
                                action: action,
                                parent: parent
                            },
                            success: function(data) {
                                formatAlertMessage(data)
                                refresh_screen();
                                $('#PleaseWaitDialog').modal('hide');
                            },
                        });
                    }
                },
                no: {
                    btnClass: 'btn-primary',
                }
            }
        });
    });
//==================================================================
    $('#create-vm-button-click').click(function() {
        $("#new_vm_creation_info_box").addClass('hide');
        if(!$('#new_vm')[0].checkValidity()){
            $('#new_vm').find('input[type="submit"]').click();
        }
        else{
            $("#new_vm_creation_info_box").removeClass('hide');
            $("#new_vm_creation_info_box").html("<i class=\"fa fa-spinner fa-spin fa-fw\"></i>Creating VM please wait.");
            $(".create_vm_buttons").addClass('disabled');
            var machinename = $('#machinename').val();
            if ($('#machine_type').val()=='import')
                machinename = $('#source-machine').val();
                $.ajax({
                    type : 'POST',
                    url : 'inc/infrastructure/KVM/CreateVM.php',
                    data: {
                        machine_type: $('#machine_type').val(),
                        hypervisor: $('#hypervisor').val(),
                        source_volume: $('#source_volume').val(),
                        source_drivepath: $('#source_drivepath').val(),
                        source_drive_size: $('#source_drive_size').val(),
                        iso_image: $('#iso_image').val(),
                        iso_path: $('#iso_path').val(),
                        numsock: $('#numsock').val(),
                        numcore: $('#numcore').val(),
                        numram: $('#numram').val(),
                      network: $('#network').val(),
                        machinename: machinename,
                        machinecount: $('#machinecount').val(),
                        os_type: $('#os_type').val(),
                        os_version: $('#os_version').val(),
                        vmname: $('#machinename').val(),
                        source_hypervisor: $('#source-hypervisor').val(),
                    },
                    success:function (data) {
                        if ($('#machine_type').val() != 'initialmachine') // initial machine uses redirect to disk_copy.php so no json messages here
                            formatAlertMessage(data);
                        $(".create_vm_buttons").removeClass('disabled');
                        $("#new_vm_creation_info_box").addClass('hide');
                        refresh_screen();
                    }
                });
            }
        });

    $('#main_table').on("click", "a.HypervisorMaintenanceButton", function() { //since table items are dynamically generated, we will not get ordinary .click() event
        var hypervisor = $(this).data('hypervisor');
        var maintenance = $(this).data('maintenance');
        var $this = $(this); //need to move reference for ajax callback as $(this) will not work in ajax 'success:'
        $.post({
            url: 'inc/infrastructure/KVM/HypervisorMaintenance.php',
                data: {
                    maintenance: maintenance,
                    hypervisor: hypervisor,
                },
                success: function(data) {
                    if (maintenance == 1){
                        $this.data('maintenance', '0');
                        $this.removeClass('glyphicon-ok-circle');
                        $this.removeClass('btn-success');
                        $this.addClass('glyphicon-ban-circle');
                        $this.addClass('btn-default');
                        $('#hypervisor-table-' + hypervisor).addClass('hypervisor-screen-disabled');
                    }
                    else{
                        $this.data('maintenance', '1');
                        $this.removeClass('glyphicon-ban-circle btn-default');
                        $this.addClass('glyphicon-ok-circle btn-success');
                        $('#hypervisor-table-' + hypervisor).removeClass('hypervisor-screen-disabled');
                      }
                    formatAlertMessage(data);
                    refresh_screen();
                    $('#PleaseWaitDialog').modal('hide');
                },
        });
    });

    $('#main_table').on("click", "a.LockVMButton", function() { //since table items are dynamically generated, we will not get ordinary .click() event
        lockVM($(this).data('id'));
    });

    $('#main_table').on("click", ".MaintenanceCheckbox", function() { //since table items are dynamically generated, we will not get ordinary .click() event
        var vm = $(this).data('id');
        $.post({
            url: 'inc/infrastructure/KVM/VMMaintenance.php',
                data: {
                    source: vm,
                    action: 'single',
                },
                success: function(data) {
                    formatAlertMessage(data);
                },
        });
    });

    $('#main_table').on("click", ".SnapshotCheckbox", function() { //since table items are dynamically generated, we will not get ordinary .click() event
        var vm = $(this).data('id');
        $.post({
            url: 'inc/infrastructure/KVM/VMSnapshot.php',
                data: {
                    vm: vm,
                    action: 'single',
                },
                success: function(data) {
                    formatAlertMessage(data);
                },
        });
    });

    $('#main_table').on("click", ".MassMaintenanceButton", function(e) { //since table items are dynamically generated, we will not get ordinary .click() event
        e.preventDefault(); // prevent href to go # (jump to the top of the page)
        $('#PleaseWaitDialog').modal('show');
        var sourcevm = $(this).data('source');
        var action = $(this).data('action');
        $.post({
            url: 'inc/infrastructure/KVM/VMMaintenance.php',
                data: {
                    source: sourcevm,
                    action: action,
                },
                success: function(data) {
                    if (action == 'mass_on')
                        $('.MaintenanceCheckboxChild-' + sourcevm).prop('checked', 'true');
                    else
                        $('.MaintenanceCheckboxChild-' + sourcevm).prop('checked', '');
                    $('#PleaseWaitDialog').modal('hide');
                    formatAlertMessage(data);
                },
        });
    });

    $('#main_table').on("click", ".MassSnapshotButton", function(e) { //since table items are dynamically generated, we will not get ordinary .click() event
        e.preventDefault(); // prevent href to go # (jump to the top of the page)
        $('#PleaseWaitDialog').modal('show');
        var sourcevm = $(this).data('source');
        var action = $(this).data('action');
        $.post({
            url: 'inc/infrastructure/KVM/VMSnapshot.php',
                data: {
                    vm: sourcevm,
                    action: action,
                },
                success: function(data) {
                    if (action == 'mass_on')
                        $('.SnapshotCheckboxChild-' + sourcevm).prop('checked', 'true');
                    else
                        $('.SnapshotCheckboxChild-' + sourcevm).prop('checked', '');
                    $('#PleaseWaitDialog').modal('hide');
                    formatAlertMessage(data);
                },
        });
    });

    $('#main_table').on("click", ".ParentRow", function(e) { //since table items are dynamically generated, we will not get ordinary .click() event
        if ($('#childof-'+this.id).hasClass('fa-minus')){
            $('#childof-'+this.id).removeClass('fa-minus');
            $('#childof-'+this.id).addClass('fa-plus');
            showHideTableSection(this.id,'hide');
        }
        else {
            $('#childof-'+this.id).removeClass('fa-plus');
            $('#childof-'+this.id).addClass('fa-minus');
            showHideTableSection(this.id,'show');
        }
    });

    $('.DeleteHypervisorButton').click(function() {
        $("#SubmitHypervisorsButton").removeClass('hide');
        var id = $(this).data('id');
        $('#hypervisor-'+id).prop('checked', true);
        $(".name-"+id).addClass('hypervisor-deleted');
    })

    $('#SubmitHypervisorsButton').click(function() {
        var to_delete = [];
        $.confirm({
            title: 'Alert!',
            content: 'Are you sure?',
            animation: 'opacity',
            buttons: {
                yes: {
                    btnClass: 'btn-danger',
                    action: function(){
                        $(":checked").each(function() {
                            if ($(this).val()!='on')
                            to_delete.push($(this).val());
                            $("#row-name-"+$(this).val()).remove();
                        });
                        $.post({
                            url : 'inc/infrastructure/KVM/UpdateHypervisors.php',
                            data: {
                                type : 'delete',
                                hypervisor : to_delete,
                            },
                            success:function (data) {
                                $("#SubmitHypervisorsButton").addClass('hide');
                                refresh_screen();
                                formatAlertMessage(data);
                            }
                        });
                    }
                },
                no: {
                    btnClass: 'btn-primary',
                }
            }
        });
    });

    $('#AddHypervisorButton').click(function() {
        if(!$('#HypervisorForm')[0].checkValidity()){
            $('#HypervisorForm').find('input[type="submit"]').click();
        }
        else{
            $("#HypervisorProgress").removeClass('hide');
            $.post({
                url : 'inc/infrastructure/KVM/UpdateHypervisors.php',
                data: {
                    type : 'new',
                    address1 : $('#address1').val(),
                    address2 : $('#address2').val(),
                    port : $('#port').val(),
                    name : $('#name').val(),
                },
                success:function (data) {
                    var msg = jQuery.parseJSON(data);
                    if ("success" in msg){
                        $("#address1").val("");
                        $("#address2").val("");
                        $("#port").val("");
                        $("#name").val("");
                        refresh_screen();
                    }
                    $("#HypervisorProgress").addClass('hide');
                    refresh_screen();
                    formatAlertMessage(data);
                }
            });
        }
    });

    $('#main_table').on("click", ".PopulateMachinesButton", function(e) { //since table items are dynamically generated, we will not get ordinary .click() event
        e.preventDefault(); // prevent href to go # (jump to the top of the page)
        if (confirm('All virtual machines will be powered off and their initial snapshots recreated.\nProceed?')){
            $('#PleaseWaitDialog').modal('show');
            var vm = $(this).data('vm');
            var hypervisor = $(this).data('hypervisor');
            $.post({
                url: 'inc/infrastructure/KVM/PopulateVMS.php',
                    data: {
                        vm: vm,
                        hypervisor: hypervisor,
                    },
                    success: function(data) {
                        $('#PleaseWaitDialog').modal('hide');
                        formatAlertMessage(data);
                    },
            });
        }
    });

    $('#main_table').on("click", ".PowerButton", function(e) { //since table items are dynamically generated, we will not get ordinary .click() event
        e.preventDefault(); // prevent href to go # (jump to the top of the page)
        if (confirm('Are you sure?')){
            $('#PleaseWaitDialog').modal('show');
            var vm = $(this).data('vm');
            var hypervisor = $(this).data('hypervisor');
            var state = $(this).data('state');
            var action = $(this).data('action');
            if (action == 'single')
                checkVMStatus(vm, state, 0);
            else
                checkVMStatus(vm, action, 1);
            $.post({
                url: 'inc/infrastructure/KVM/Power.php',
                    data: {
                        vm: vm,
                        hypervisor: hypervisor,
                        state: state,
                        action: action,
                    },
                    success: function(data) {
                        $('#PleaseWaitDialog').modal('hide');
                        formatAlertMessage(data);
                    },
            });
        }
    });


});
//==================================================================
