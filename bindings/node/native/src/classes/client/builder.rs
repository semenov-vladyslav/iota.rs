use std::sync::{Arc, Mutex};

use iota::client::{BrokerOptions, ClientBuilder};
use neon::prelude::*;

pub struct ClientBuilderWrapper {
    nodes: Arc<Mutex<Vec<String>>>,
    quorum_size: Arc<Mutex<Option<u8>>>,
    quorum_threshold: Arc<Mutex<Option<u8>>>,
    broker_options: Arc<Mutex<Option<BrokerOptions>>>,
}

declare_types! {
    pub class JsClientBuilder for ClientBuilderWrapper {
        init(_) {
            Ok(ClientBuilderWrapper {
                nodes: Arc::new(Mutex::new(vec![])),
                quorum_size: Arc::new(Mutex::new(None)),
                quorum_threshold: Arc::new(Mutex::new(None)),
                broker_options: Arc::new(Mutex::new(None)),
            })
        }

        method node(mut cx) {
            let node_url = cx.argument::<JsString>(0)?.value();
            {
                let this = cx.this();
                let guard = cx.lock();
                let ref_ = &(*this.borrow(&guard)).nodes;
                let mut nodes = ref_.lock().unwrap();
                nodes.push(node_url);
            }
            Ok(cx.this().upcast())
        }

        method nodes(mut cx) {
            let js_node_urls = cx.argument::<JsArray>(0)?;
            let js_node_urls: Vec<Handle<JsValue>> = js_node_urls.to_vec(&mut cx)?;
            let mut node_urls = vec![];
            for js_node_url in js_node_urls {
                let node_url: Handle<JsString> = js_node_url.downcast_or_throw(&mut cx)?;
                node_urls.push(node_url.value());
            }
            {
                let this = cx.this();
                let guard = cx.lock();
                let ref_ = &(*this.borrow(&guard)).nodes;
                let mut nodes = ref_.lock().unwrap();
                for node_url in node_urls {
                    nodes.push(node_url);
                }
            }
            Ok(cx.this().upcast())
        }

        method quorumThreshold(mut cx) {
            let threshold = cx.argument::<JsNumber>(0)?.value() as u8;
            {
                let this = cx.this();
                let guard = cx.lock();
                let ref_ = &(*this.borrow(&guard)).quorum_threshold;
                let mut quorum_threshold_ref = ref_.lock().unwrap();
                quorum_threshold_ref.replace(threshold);
            }
            Ok(cx.this().upcast())
        }

        method quorumSize(mut cx) {
            let quorum_size = cx.argument::<JsNumber>(0)?.value() as u8;
            {
                let this = cx.this();
                let guard = cx.lock();
                let ref_ = &(*this.borrow(&guard)).quorum_size;
                let mut quorum_size_ref = ref_.lock().unwrap();
                quorum_size_ref.replace(quorum_size);
            }
            Ok(cx.this().upcast())
        }

        method brokerOptions(mut cx) {
            let options = cx.argument::<JsString>(0)?.value();
            let options: BrokerOptions = serde_json::from_str(&options).expect("invalid broker options JSON");
            {
                let this = cx.this();
                let guard = cx.lock();
                let ref_ = &(*this.borrow(&guard)).broker_options;
                let mut broker_options_ref = ref_.lock().unwrap();
                broker_options_ref.replace(options);
            }
            Ok(cx.this().upcast())
        }

        method build(mut cx) {
            let client = {
                let this = cx.this();
                let guard = cx.lock();
                let ref_ = &*this.borrow(&guard);
                let mut builder = ClientBuilder::new();

                for node in &*ref_.nodes.lock().unwrap() {
                    builder = builder.node(node.as_str()).unwrap_or_else(|_| panic!("invalid node url: {}", node));
                }
                if let Some(quorum_size) = &*ref_.quorum_size.lock().unwrap() {
                    builder = builder.quorum_size(*quorum_size);
                }
                if let Some(quorum_threshold) = &*ref_.quorum_threshold.lock().unwrap() {
                    builder = builder.quorum_threshold(*quorum_threshold);
                }
                if let Some(broker_options) = &*ref_.broker_options.lock().unwrap() {
                    builder = builder.broker_options(broker_options.clone());
                }
                builder.build().expect("failed to build client instance")
            };
            let id = crate::store_client(client);
            let id = cx.string(id);
            Ok(super::JsClient::new(&mut cx, vec![id])?.upcast())
        }
    }
}
